import { FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-blue-500" />
          <h1 className="text-4xl font-bold">Terms of Service</h1>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6">
          <section>
            <p className="text-zinc-400 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Agreement to Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              By accessing and using My AI Agent ("the Service"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Service Description</h2>
            <p className="text-zinc-300 leading-relaxed">
              My AI Agent provides an AI-powered chat interface with integrations to various 
              Google services (Gmail, Calendar, Drive, Docs, Sheets) through OAuth authentication.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Use the Service in compliance with applicable laws and regulations</li>
              <li>Not attempt to gain unauthorized access to the Service or other users' data</li>
              <li>Not use the Service for any illegal or harmful purposes</li>
              <li>Ensure your Google account permissions are properly managed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Google Services Integration</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              When you connect your Google account, you grant the Service permission to access 
              the scopes you authorize. You can revoke these permissions at any time through 
              your Google account settings or by disconnecting within the app.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              We comply with Google's API Services User Data Policy, including the Limited Use 
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Acceptable Use</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Abuse or overload the Service infrastructure</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use the Service to send spam or malicious content</li>
              <li>Share your account credentials with others</li>
              <li>Violate any third-party rights, including privacy rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Data Usage and Privacy</h2>
            <p className="text-zinc-300 leading-relaxed">
              Your use of the Service is also governed by our{' '}
              <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </a>
              . Please review it to understand how we collect and use your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Service Availability</h2>
            <p className="text-zinc-300 leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access 
              to the Service. We may modify, suspend, or discontinue any part of the Service 
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Limitation of Liability</h2>
            <p className="text-zinc-300 leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We are not liable 
              for any damages arising from your use of the Service, including but not limited to 
              data loss, service interruptions, or unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Account Termination</h2>
            <p className="text-zinc-300 leading-relaxed">
              We reserve the right to terminate or suspend accounts that violate these Terms of 
              Service. You may delete your account at any time through the app settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Changes to Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update these Terms of Service from time to time. Continued use of the 
              Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Contact</h2>
            <p className="text-zinc-300 leading-relaxed">
              For questions about these Terms of Service, please contact us through the app 
              settings.
            </p>
          </section>

          <section className="border-t border-zinc-700 pt-6">
            <p className="text-sm text-zinc-400">
              By using My AI Agent, you acknowledge that you have read and understood these 
              Terms of Service and agree to be bound by them.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
