import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Database, Key, Users, HardDrive, Mail, Globe, Lock, Baby, Bell } from "lucide-react";

const PrivacyPolicy = () => {
  usePageTitle("Privacy Policy");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Linkedbot, operated by Bhatnagar Digital Labs, respects your privacy and is committed to protecting your personal data.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: March 7, 2026</p>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                    <h3 className="font-semibold text-foreground mt-2 mb-1">Personal Information</h3>
                    <p className="text-muted-foreground mb-2">Name, email address, phone number, billing information, payment details (processed through secure third-party providers), and account credentials.</p>
                    <h3 className="font-semibold text-foreground mt-3 mb-1">Usage Data</h3>
                    <p className="text-muted-foreground mb-2">IP address, browser type, device type, operating system, pages visited, usage behavior, and time/date of access.</p>
                    <h3 className="font-semibold text-foreground mt-3 mb-1">Cookies and Tracking</h3>
                    <p className="text-muted-foreground">Used to improve experience, remember login sessions, analyze traffic, and provide improvements. Users can disable cookies through browser settings.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To provide and maintain the Linkedbot service</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To create and manage user accounts</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To process payments and subscriptions</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To improve platform functionality and user experience</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To communicate product updates or support information</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To prevent fraud, abuse, or illegal activities</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>To comply with legal obligations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3–4. Legal Basis & Data Sharing</h2>
                    <p className="text-muted-foreground mb-2">For EEA/UK users, we process data based on consent and contractual necessity.</p>
                    <p className="text-muted-foreground mb-2">We do <strong className="text-foreground">not</strong> sell personal data. We may share information with trusted third parties: payment processors, hosting providers, analytics services, customer support platforms, and legal authorities if required by law.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
                    <p className="text-muted-foreground">We retain personal data only as long as necessary for providing the service, complying with legal obligations, resolving disputes, and enforcing agreements. Users may request deletion of their account and associated data.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
                    <p className="text-muted-foreground">We implement industry-standard security measures including encrypted connections (HTTPS/SSL), secure cloud infrastructure, and access control mechanisms. However, no internet system is completely secure.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Privacy Rights</h2>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><strong className="text-foreground">Right to Access</strong> — Request a copy of your personal data</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><strong className="text-foreground">Right to Rectification</strong> — Request correction of inaccurate data</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><strong className="text-foreground">Right to Erasure</strong> — Request deletion of your personal data</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><strong className="text-foreground">Right to Restrict Processing</strong> — Request limited processing</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><strong className="text-foreground">Right to Data Portability</strong> — Request data in a portable format</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><strong className="text-foreground">Right to Withdraw Consent</strong> — Withdraw consent at any time</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">8–9. International Transfers & Third-Party Services</h2>
                    <p className="text-muted-foreground">Your information may be transferred to and processed in countries outside your own. We implement appropriate safeguards in accordance with GDPR and applicable privacy laws.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Baby className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">10. Children's Privacy</h2>
                    <p className="text-muted-foreground">Linkedbot is not intended for individuals under the age of 18. We do not knowingly collect personal data from children.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-teal-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">11. Changes to This Privacy Policy</h2>
                    <p className="text-muted-foreground">We may update this Privacy Policy periodically. Continued use of Linkedbot after changes indicates acceptance of the updated policy.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">12. Contact Information</h2>
                    <p className="text-muted-foreground">
                      If you have questions about this Privacy Policy, you may contact us:<br />
                      <strong className="text-foreground">Bhatnagar Digital Labs</strong><br />
                      Email: <a href="mailto:Team@linkedbot.online" className="text-primary hover:underline">Team@linkedbot.online</a><br />
                      Website: <a href="https://linkedbot.online" className="text-primary hover:underline">linkedbot.online</a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
