import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/channels`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to fetch channels';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching channels:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to fetch channels' },
            { status: 500 }
        );
    }
}

/**
 * Exchange OAuth authorization code for access token with Meta
 */
async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; userId: string }> {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error('Meta App ID or App Secret not configured. Please set NEXT_PUBLIC_META_APP_ID and META_APP_SECRET environment variables.');
    }

    // Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;

    const response = await fetch(tokenUrl, { method: 'GET' });
    const data = await response.json() as { access_token?: string; error?: { message: string } };

    if (data.error || !data.access_token) {
        console.error('Token exchange error:', data);
        throw new Error(data.error?.message || 'Failed to exchange authorization code for access token');
    }

    // Get user ID from the debug token
    const debugResponse = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?input_token=${data.access_token}&access_token=${appId}|${appSecret}`
    );
    const debugData = await debugResponse.json() as { data?: { user_id?: string } };

    return {
        accessToken: data.access_token,
        userId: debugData.data?.user_id || ''
    };
}

/**
 * Fetch WhatsApp Business Account details using the access token from embedded signup
 * @param accessToken - The access token from Meta
 * @param providedWabaId - Optional WABA ID from embedded signup callback (preferred when available)
 */
async function fetchWhatsAppBusinessDetails(
    accessToken: string,
    providedWabaId?: string
): Promise<{
    wabaId: string;
    phoneNumberId: string;
    verifiedName: string;
    displayPhoneNumber: string;
}> {
    let wabaId = providedWabaId || '';

    // If wabaId not provided, try to fetch it from the API
    if (!wabaId) {
        console.log('No WABA ID provided, attempting to fetch from API...');

        try {
            // Try to get WhatsApp Business Account from the shared WABAs
            // Note: This requires the whatsapp_business_management permission or the token to have access
            const wabasUrl = `https://graph.facebook.com/v18.0/me/whatsapp_business_accounts?access_token=${accessToken}`;
            const wabaResponse = await fetch(wabasUrl);
            const wabaData = await wabaResponse.json() as { data?: { id: string; name?: string }[]; error?: { message: string } };

            if (wabaData.error) {
                console.error('Error fetching WABAs from Meta:', wabaData.error);
                // If we can't list WABAs, we can't proceed without a provided WABA ID
                throw new Error('Could not retrieve WhatsApp Business Account. Please ensure you selected an account during signup.');
            }

            if (!wabaData.data || wabaData.data.length === 0) {
                throw new Error('No WhatsApp Business Account found. Please make sure you selected a WABA during signup.');
            }

            // Use the first WABA (from embedded signup, there should be exactly one)
            wabaId = wabaData.data[0].id;
            console.log('Fetched WABA ID from API:', wabaId);
        } catch (error: any) {
            console.error('Failed to resolve WABA ID:', error);
            throw new Error(error.message || 'Failed to determine WhatsApp Business Account ID');
        }
    } else {
        console.log('Using provided WABA ID:', wabaId);
    }

    // Get phone numbers for this WABA
    const phoneNumbersUrl = `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
    console.log('Fetching phone numbers for WABA:', wabaId);

    try {
        const phoneResponse = await fetch(phoneNumbersUrl);
        const phoneData = await phoneResponse.json() as {
            data?: { id: string; display_phone_number?: string; verified_name?: string }[];
            error?: { message: string }
        };

        if (phoneData.error) {
            console.error('Error fetching phone numbers:', phoneData.error);
            throw new Error(phoneData.error.message || 'Failed to fetch phone numbers for the WhatsApp Business Account');
        }

        // Handle case where no phone numbers exist yet (user selected "Add phone number later")
        if (!phoneData.data || phoneData.data.length === 0) {
            console.log('No phone numbers found for WABA. User may have selected "Add phone number later"');

            // Get WABA name as fallback for display error
            let wabaName = wabaId;
            try {
                const wabaDetailsUrl = `https://graph.facebook.com/v18.0/${wabaId}?fields=name&access_token=${accessToken}`;
                const wabaDetailsResponse = await fetch(wabaDetailsUrl);
                const wabaDetails = await wabaDetailsResponse.json() as { name?: string };
                if (wabaDetails.name) wabaName = wabaDetails.name;
            } catch (e) {
                // Ignore error fetching name
            }

            throw new Error(
                `No phone numbers found for WhatsApp Business Account "${wabaName}". ` +
                'Please add a phone number in WhatsApp Manager first, then try connecting again.'
            );
        }

        // Use the first phone number
        const phoneNumber = phoneData.data[0];
        console.log('Found phone number:', { id: phoneNumber.id, display: phoneNumber.display_phone_number });

        return {
            wabaId,
            phoneNumberId: phoneNumber.id,
            verifiedName: phoneNumber.verified_name || '',
            displayPhoneNumber: phoneNumber.display_phone_number || ''
        };
    } catch (error: any) {
        // Re-throw errors that act as logic control flow (like the "No phone numbers" error above)
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized - Please log in to connect channels' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Handle OAuth code exchange for embedded signup (WhatsApp)
        if (body.channelType === 'whatsapp' && body.credentials?.authCode) {
            console.log('Processing WhatsApp embedded signup with auth code...');

            try {
                // Exchange auth code for access token
                const { accessToken } = await exchangeCodeForToken(body.credentials.authCode);
                console.log('Successfully exchanged auth code for access token');

                let wabaId = body.credentials.wabaId || '';
                let phoneNumberId = body.credentials.phoneNumberId || '';
                let verifiedName = '';
                let displayPhoneNumber = '';

                // Check if we have all required data from the callback
                if (wabaId && phoneNumberId) {
                    // Case 1: Both wabaId and phoneNumberId provided from callback
                    console.log('Using WABA data from embedded signup callback:', { wabaId, phoneNumberId });

                    // Fetch additional details for the phone number
                    try {
                        const phoneDetailsUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`;
                        const phoneResponse = await fetch(phoneDetailsUrl);
                        const phoneData = await phoneResponse.json() as {
                            display_phone_number?: string;
                            verified_name?: string;
                            error?: { message: string }
                        };

                        if (!phoneData.error) {
                            verifiedName = phoneData.verified_name || '';
                            displayPhoneNumber = phoneData.display_phone_number || '';
                            console.log('Fetched phone details:', { verifiedName, displayPhoneNumber });
                        } else {
                            console.warn('Could not fetch phone details:', phoneData.error);
                        }
                    } catch (detailsErr) {
                        console.warn('Error fetching phone details, continuing without them:', detailsErr);
                    }
                } else if (wabaId && !phoneNumberId) {
                    // Case 2: wabaId provided but no phoneNumberId (user may have selected "Add phone number later")
                    console.log('WABA ID provided but no phone number ID. Fetching phone numbers from WABA...');
                    try {
                        const wabaDetails = await fetchWhatsAppBusinessDetails(accessToken, wabaId);
                        phoneNumberId = wabaDetails.phoneNumberId;
                        verifiedName = wabaDetails.verifiedName;
                        displayPhoneNumber = wabaDetails.displayPhoneNumber;
                        console.log('Successfully fetched phone number from WABA:', {
                            wabaId,
                            phoneNumberId,
                            displayPhoneNumber
                        });
                    } catch (fetchErr: any) {
                        console.error('Failed to fetch phone numbers from WABA:', fetchErr.message);
                        throw new Error(fetchErr.message || 'Could not retrieve phone numbers from WhatsApp Business Account.');
                    }
                } else {
                    // Case 3: No WABA data in callback, fetch everything from API
                    console.log('No WABA data in callback, attempting to fetch from API...');
                    try {
                        const wabaDetails = await fetchWhatsAppBusinessDetails(accessToken);
                        wabaId = wabaDetails.wabaId;
                        phoneNumberId = wabaDetails.phoneNumberId;
                        verifiedName = wabaDetails.verifiedName;
                        displayPhoneNumber = wabaDetails.displayPhoneNumber;
                        console.log('Successfully fetched WABA details:', {
                            wabaId,
                            phoneNumberId,
                            displayPhoneNumber
                        });
                    } catch (fetchErr: any) {
                        console.error('Failed to fetch WABA details from API:', fetchErr.message);
                        throw new Error(fetchErr.message || 'Could not retrieve WhatsApp Business Account details. Please try again or use Manual Configuration.');
                    }
                }

                // Replace credentials with the actual API credentials
                body.credentials = {
                    accessToken,
                    phoneNumberId,
                    businessAccountId: wabaId,
                    wabaId,
                    verifiedName,
                    displayPhoneNumber
                };

                // Update channel name with the verified name or phone number
                if (verifiedName) {
                    body.name = verifiedName;
                } else if (displayPhoneNumber) {
                    body.name = `WhatsApp ${displayPhoneNumber}`;
                }
            } catch (exchangeError: any) {
                console.error('Embedded signup token exchange failed:', exchangeError);
                return NextResponse.json(
                    { message: exchangeError.message || 'Failed to complete WhatsApp embedded signup' },
                    { status: 400 }
                );
            }
        }

        let response;
        try {
            response = await fetch(`${API_BASE_URL}/api/v1/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
        } catch (fetchError: any) {
            console.error('Failed to connect to backend API:', fetchError);
            return NextResponse.json(
                { message: 'Service temporarily unavailable. Please check if the backend server is running.' },
                { status: 503 }
            );
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to create channel';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error creating channel:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to create channel' },
            { status: 500 }
        );
    }
}
