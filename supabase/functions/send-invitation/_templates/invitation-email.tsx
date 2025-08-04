
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface InvitationEmailProps {
  inviterName: string;
  inviteeEmail: string;
  companyName?: string;
  role: string;
  magicLink: string;
}

export const InvitationEmail = ({
  inviterName,
  inviteeEmail,
  companyName,
  role,
  magicLink,
}: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>You've been invited to join {companyName || 'ONEGO Learning'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <img 
          src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
          alt="ONEGO Learning" 
          style={logo}
        />
        <Heading style={h1}>You're Invited!</Heading>
        <Text style={text}>
          {inviterName} has invited you to join {companyName || 'their team'} on ONEGO Learning, 
          an AI-powered training platform.
        </Text>
        <Text style={text}>
          You've been assigned the role of <strong>{role}</strong>.
        </Text>
        <Link
          href={magicLink}
          target="_blank"
          style={button}
        >
          Accept Invitation & Join Team
        </Link>
        <Text style={text}>
          Or copy and paste this link in your browser:
        </Text>
        <Text style={code}>{magicLink}</Text>
        <Text style={footerText}>
          This invitation will expire in 7 days. If you didn't expect this invitation, 
          you can safely ignore this email.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The ONEGO Learning Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InvitationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logo = {
  margin: '0 auto',
  height: '48px',
  display: 'block',
  marginBottom: '32px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px 0',
  margin: '32px auto',
};

const code = {
  backgroundColor: '#f4f4f4',
  border: '1px solid #eee',
  borderRadius: '5px',
  color: '#333',
  fontSize: '14px',
  margin: '16px 40px',
  padding: '16px',
  wordBreak: 'break-all' as const,
};

const footerText = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '32px 40px 16px',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 40px',
};
