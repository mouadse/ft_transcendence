import './Settings.css';

function defaultClose() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = '/login';
}

export default function PrivacyPolicy({ onClose }) {
  const handleClose = onClose || defaultClose;

  return (
    <div
      className="st-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="st-modal-panel st-legal-panel">
        <button className="st-modal-close" onClick={handleClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>

        <div className="st-legal-eyebrow">Privacy</div>
        <h3 className="st-modal-title">Privacy Policy</h3>
        <p className="st-legal-date">Last updated: April 2026</p>

        <div className="st-legal-body">
          <section className="st-legal-section">
            <h4>1. Information We Collect</h4>
            <p>
              We collect information you provide directly to us when you create an account and use
              CFit, including your name, email address, date of birth, height, weight, fitness
              goals, and activity level. We also collect the workout logs, meal logs, and body
              metrics you voluntarily enter into the application.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>2. How We Use Your Information</h4>
            <p>
              We use the information we collect to provide, maintain, and improve our services,
              calculate your personalised nutrition targets and fitness recommendations, and
              communicate with you about your account. We do not sell your personal data to
              third parties.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>3. Data Storage and Security</h4>
            <p>
              Your data is stored on secured servers. We implement industry-standard technical and
              organisational measures to protect your personal information against unauthorised
              access, alteration, disclosure, or destruction. Your passwords are hashed and never
              stored in plain text.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>4. Data Retention</h4>
            <p>
              We retain your personal data for as long as your account remains active or as needed
              to provide you with services. You may request deletion of your account and associated
              data at any time through the Settings page. Some data may be retained for legal or
              operational purposes after account deletion.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>5. Your Rights</h4>
            <p>
              You have the right to access, correct, or delete your personal information. You may
              export a copy of your data at any time using the Export My Data feature. To exercise
              any of these rights, use the account management tools in Settings or contact us
              directly.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>6. Cookies and Tracking</h4>
            <p>
              We use session tokens and local storage to maintain your authenticated session and
              store your application preferences. We do not use third-party advertising trackers
              or share browsing data with advertisers.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>7. Changes to This Policy</h4>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by posting the new policy within the app and updating the
              effective date at the top of this document. Continued use of CFit after changes
              are posted constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>8. Contact</h4>
            <p>
              If you have questions about this Privacy Policy or how your data is handled, please
              contact us at <strong>support@cfit.app</strong>.
            </p>
          </section>
        </div>

        <button className="st-modal-btn st-modal-btn--primary st-legal-close-btn" onClick={handleClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
