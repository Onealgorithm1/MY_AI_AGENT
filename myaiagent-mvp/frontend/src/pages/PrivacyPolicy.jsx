import { FileText } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-blue-500" />
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6">
          <section>
            <p className="text-zinc-400 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Introduction</h2>
            <p className="text-zinc-300 leading-relaxed">
              My AI Agent ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information 
              when you use our AI chat application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Information We Collect</h2>
            <div className="space-y-4 text-zinc-300">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Account Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Email address</li>
                  <li>Full name</li>
                  <li>Phone number (optional)</li>
                  <li>Profile picture (optional)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Google Account Information</h3>
                <p className="leading-relaxed mb-2">
                  When you connect your Google account, we access:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Basic profile information (name, email, profile picture)</li>
                  <li>Gmail data (when you authorize Gmail access)</li>
                  <li>Google Calendar data (when you authorize Calendar access)</li>
                  <li>Google Drive files (when you authorize Drive access)</li>
                  <li>Google Docs and Sheets (when you authorize Docs/Sheets access)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-2">Usage Data</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Chat messages and conversations</li>
                  <li>AI interaction history</li>
                  <li>Preferences and settings</li>
                  <li>API usage statistics</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>To provide and maintain our AI chat services</li>
              <li>To personalize your experience with AI responses</li>
              <li>To enable Google service integrations (Gmail, Calendar, Drive, etc.)</li>
              <li>To improve our services and develop new features</li>
              <li>To communicate with you about service updates</li>
              <li>To ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Data Storage and Security</h2>
            <div className="space-y-4 text-zinc-300">
              <p className="leading-relaxed">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>OAuth tokens encrypted with AES-256-GCM encryption</li>
                <li>Passwords hashed using bcrypt</li>
                <li>Secure HTTPS connections for all data transmission</li>
                <li>Regular security audits and updates</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Google API Services</h2>
            <div className="space-y-4 text-zinc-300">
              <p className="leading-relaxed">
                Our use of information received from Google APIs adheres to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <p className="leading-relaxed">
                We only access Google services that you explicitly authorize and use them 
                solely to provide the features you request (email management, calendar access, 
                file operations, etc.).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Third-Party Services</h2>
            <div className="space-y-4 text-zinc-300">
              <p className="leading-relaxed">
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>OpenAI API for AI chat functionality</li>
                <li>Google APIs (Gmail, Calendar, Drive, Docs, Sheets)</li>
                <li>PostgreSQL for data storage</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Your Rights</h2>
            <div className="space-y-4 text-zinc-300">
              <p className="leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal data</li>
                <li>Update or correct your information</li>
                <li>Delete your account and associated data</li>
                <li>Disconnect Google services at any time</li>
                <li>Revoke Google API access permissions</li>
                <li>Export your data</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Data Retention</h2>
            <p className="text-zinc-300 leading-relaxed">
              We retain your data for as long as your account is active. When you delete your 
              account, we remove your personal data from our systems. Google OAuth tokens are 
              automatically revoked when you disconnect your Google account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Contact Us</h2>
            <p className="text-zinc-300 leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please 
              contact us through the app settings or at your configured support email.
            </p>
          </section>

          <section className="border-t border-zinc-700 pt-6">
            <p className="text-sm text-zinc-400">
              This privacy policy is subject to change. We will notify users of significant 
              updates through the application.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
