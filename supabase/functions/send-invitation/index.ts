
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { invitations } = await req.json()
    console.log('Processing invitations:', invitations)

    if (!Array.isArray(invitations) || invitations.length === 0) {
      throw new Error('Invalid invitations data')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Check license limits before processing any invitations
    const inviterId = invitations[0].inviter_id
    const { data: subscriber, error: subError } = await supabaseClient
      .from('subscribers')
      .select('licenses_purchased, licenses_used')
      .eq('user_id', inviterId)
      .single()

    if (subError || !subscriber) {
      throw new Error('Could not verify license information')
    }

    // NOTE: License usage is now tracked on acceptance, not creation
    // We still check available licenses to prevent over-inviting
    const pendingInvites = await supabaseClient
      .from('invitations')
      .select('id')
      .eq('inviter_id', inviterId)
      .eq('status', 'pending')

    const totalPendingCount = (pendingInvites.data?.length || 0) + invitations.length
    const availableLicenses = subscriber.licenses_purchased - subscriber.licenses_used

    if (totalPendingCount > availableLicenses) {
      throw new Error(`License limit exceeded. You have ${availableLicenses} available licenses but would have ${totalPendingCount} total pending invitations.`)
    }

    const results = []

    for (const invitation of invitations) {
      try {
        const { inviter_id, inviter_email, invitee_email, role } = invitation
        
        console.log('Processing invitation:', { inviter_id, inviter_email, invitee_email, role })
        
        // Validate required fields
        if (!inviter_id || !invitee_email || !role) {
          throw new Error('Missing required fields: inviter_id, invitee_email, or role')
        }

        // Check if invitation already exists for this email
        const { data: existingInvite } = await supabaseClient
          .from('invitations')
          .select('id')
          .eq('inviter_id', inviter_id)
          .eq('invitee_email', invitee_email)
          .eq('status', 'pending')
          .single()

        if (existingInvite) {
          results.push({
            email: invitee_email,
            status: 'failed',
            error: 'Invitation already exists for this email'
          })
          continue
        }

        // Get inviter's information including group_id
        let finalInviterEmail = inviter_email
        let inviterName = ''
        
        if (!finalInviterEmail) {
          const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(inviter_id)
          
          if (authError || !authUser.user) {
            console.error('Error fetching inviter auth data:', authError)
            throw new Error('Could not fetch inviter email')
          }

          finalInviterEmail = authUser.user.email
        }

        // Get inviter's profile for name and group info
        const { data: inviterProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('full_name, group_id')
          .eq('id', inviter_id)
          .single()

        if (profileError || !inviterProfile) {
          console.error('Error fetching inviter profile:', profileError)
          throw new Error('Could not fetch inviter information')
        }

        if (!inviterProfile.group_id) {
          throw new Error('Inviter does not belong to a group')
        }

        inviterName = inviterProfile.full_name || finalInviterEmail

        // Generate magic link token
        const magicToken = crypto.randomUUID()
        
        // Store invitation in database (group_id will be set automatically by trigger)
        const { data: inviteData, error: inviteError } = await supabaseClient
          .from('invitations')
          .insert({
            inviter_id,
            inviter_email: finalInviterEmail,
            invitee_email,
            role,
            magic_link_token: magicToken,
            status: 'pending'
          })
          .select()
          .single()

        if (inviteError) {
          console.error('Database error:', inviteError)
          throw inviteError
        }

        console.log('Invitation stored in database:', inviteData)

        // NEW: Use clean URL structure for Vercel compatibility
        const baseUrl = 'https://app.onego.ai'
        const inviteUrl = `${baseUrl}/accept-invitation/${magicToken}`
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ONEGO Learning <noreply@updates.onego.ai>',
            to: [invitee_email],
            subject: `You've been invited to join ${inviterName}'s team on ONEGO Learning`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" alt="ONEGO Learning" style="height: 60px;" />
                </div>
                
                <h2 style="color: #16a34a; text-align: center;">You're Invited to Join a Team!</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 16px;"><strong>${inviterName}</strong> has invited you to join their team on ONEGO Learning as a <strong>${role}</strong>.</p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6;">ONEGO Learning is an AI-powered training platform that helps teams learn and grow together through personalized courses and interactive sessions.</p>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${inviteUrl}" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">Accept Invitation</a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>New to ONEGO?</strong> No problem! Clicking the button above will guide you through creating your account and joining the team.
                  </p>
                </div>
                
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #0c5460;">
                    <strong>Already have an account?</strong> You'll be able to join this new team while keeping your existing account.
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                  This invitation will expire in 7 days. If you have any questions, please contact ${finalInviterEmail}.
                </p>
                
                <p style="color: #888; font-size: 12px; text-align: center;">
                  ONEGO Learning - AI-Powered Training Platform
                </p>
              </div>
            `
          })
        })

        const emailResult = await emailResponse.json()
        
        if (!emailResponse.ok) {
          console.error('Email sending failed:', emailResult)
          // If email fails, delete the invitation to free up the slot
          await supabaseClient
            .from('invitations')
            .delete()
            .eq('id', inviteData.id)
          
          throw new Error(`Email sending failed: ${emailResult.message || 'Unknown error'}`)
        }

        console.log('Email sent successfully to:', invitee_email)
        results.push({ 
          email: invitee_email, 
          status: 'sent',
          invitation_id: inviteData.id 
        })

      } catch (error) {
        console.error(`Failed to process invitation for ${invitation.invitee_email}:`, error)
        results.push({
          email: invitation.invitee_email,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Processed ${results.length} invitations`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
