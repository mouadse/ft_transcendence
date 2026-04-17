import './Settings.css';

function defaultClose() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = '/login';
}

export default function TermsOfService({ onClose }) {
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

        <div className="st-legal-eyebrow">Terms</div>
        <h3 className="st-modal-title">Terms of Service</h3>
        <p className="st-legal-date">Last updated: April 2026</p>

        <div className="st-legal-body">
          <section className="st-legal-section">
            <h4>1. Acceptance of Terms</h4>
            <p>
              By creating an account and using CFit, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the application.
              These terms apply to all users of the platform.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>2. Use of the Service</h4>
            <p>
              CFit is a personal fitness and nutrition tracking application. You agree to use
              CFit only for its intended purpose — tracking your workouts, nutrition, and
              fitness progress. You must not use CFit in any way that is unlawful, harmful,
              or disruptive to other users or to the service itself.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>3. Account Responsibility</h4>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              All activity that occurs under your account is your responsibility. You should
              notify us immediately if you suspect any unauthorised access to your account.
              We recommend enabling Two-Factor Authentication (2FA) for additional security.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>4. Health Disclaimer</h4>
            <p>
              The nutrition targets, fitness recommendations, and AI coach suggestions provided
              by CFit are for informational purposes only. They are not a substitute for
              professional medical or nutritional advice. Always consult a qualified healthcare
              professional before making significant changes to your diet or exercise routine,
              especially if you have a medical condition.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>5. Intellectual Property</h4>
            <p>
              All content, design, software, and features within CFit are the property of the
              CFit team and are protected by applicable intellectual property laws. You may not
              copy, modify, distribute, or reverse-engineer any part of the application without
              our explicit written permission.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>6. User Content</h4>
            <p>
              You retain ownership of the personal data and logs you enter into CFit. By using
              the service, you grant us a limited licence to store and process your data solely
              for the purpose of providing and improving the service. We do not claim ownership
              of your personal health data.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>7. Termination</h4>
            <p>
              We reserve the right to suspend or terminate your account if you violate these
              Terms of Service. You may delete your account at any time through the Settings
              page. Upon deletion, your personal data will be removed according to our Privacy
              Policy.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>8. Limitation of Liability</h4>
            <p>
              CFit is provided "as is" without warranties of any kind. To the fullest extent
              permitted by law, we are not liable for any indirect, incidental, or consequential
              damages arising from your use of the service. Our total liability to you shall not
              exceed the amount you have paid for the service in the past twelve months.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>9. Changes to These Terms</h4>
            <p>
              We may revise these Terms of Service at any time. We will notify you of material
              changes within the app and update the effective date above. Continued use of
              CFit after changes are published constitutes your acceptance of the revised terms.
            </p>
          </section>

          <section className="st-legal-section">
            <h4>10. Contact</h4>
            <p>
              If you have questions about these Terms of Service, please contact us at{' '}
              <strong>support@cfit.app</strong>.
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
