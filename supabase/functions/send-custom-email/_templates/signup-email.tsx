
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ONEGOSignupEmailProps {
  confirmationUrl: string
  userEmail: string
  firstName: string
}

export const ONEGOSignupEmail = ({
  confirmationUrl,
  userEmail,
  firstName,
}: ONEGOSignupEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirm your sign up to ONEGO Learning</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Img
            src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png"
            width="200"
            height="60"
            alt="ONEGO Learning"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>Welcome to ONEGO Learning, {firstName}!</Heading>
        
        <Text style={text}>
          Thank you for signing up for your free trial. You're just one click away from accessing AI-powered training and tutoring.
        </Text>
        
        <Section style={buttonContainer}>
          <Link
            href={confirmationUrl}
            style={button}
          >
            Confirm Your Sign Up
          </Link>
        </Section>
        
        <Text style={text}>
          Once confirmed, you'll be able to:
        </Text>
        
        <ul style={list}>
          <li style={listItem}>Create unlimited AI-powered courses</li>
          <li style={listItem}>Chat with Nia, your Australian AI tutor</li>
          <li style={listItem}>Track your learning progress</li>
          <li style={listItem}>Access voice and text tutoring</li>
        </ul>
        
        <Text style={smallText}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          Questions? Reply to this email or visit{' '}
          <Link href="https://onego.ai" style={link}>
            onego.ai
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#22c55e',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
}

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  paddingLeft: '20px',
}

const listItem = {
  margin: '8px 0',
}

const smallText = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '32px',
  textAlign: 'center' as const,
}

const link = {
  color: '#22c55e',
  textDecoration: 'underline',
}
