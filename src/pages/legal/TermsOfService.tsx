import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, UserCheck, Shield, CreditCard, Ban, BookOpen, Globe, Scale, AlertTriangle, Mail } from "lucide-react";

const TermsOfService = () => {
  usePageTitle("Terms & Conditions");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These Terms govern your use of the Linkedbot platform, website, and services operated by Bhatnagar Digital Labs.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: March 7, 2026</p>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Account Registration</h2>
                    <p className="text-muted-foreground mb-2">To use Linkedbot, users must create an account. By registering, you agree that:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>All information provided during signup is accurate and complete</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>You are responsible for maintaining the confidentiality of your login credentials</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>You accept responsibility for all activities under your account</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. Eligibility</h2>
                    <p className="text-muted-foreground">You confirm that you are at least 18 years old, or have the legal authority to enter into this agreement under applicable laws.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Ban className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Acceptable Use</h2>
                    <p className="text-muted-foreground">You agree to use Linkedbot only for lawful and ethical purposes. Users must NOT use the service for spam or illegal activities.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscriptions and Payments</h2>
                    <p className="text-muted-foreground mb-2">Linkedbot may offer monthly subscription plans and one-time payment plans. By purchasing, you agree to:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Pay all applicable fees</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Provide accurate billing information</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Authorize the Company to process payments</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5–6. Refund Policy & Account Suspension</h2>
                    <p className="text-muted-foreground mb-2">Refunds are issued at the discretion of Bhatnagar Digital Labs and may be denied if the service has been used significantly or fraudulent activity is suspected.</p>
                    <p className="text-muted-foreground">We reserve the right to suspend or terminate accounts if Terms are violated, fraudulent behavior is detected, or the service is abused.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
                    <p className="text-muted-foreground">All rights related to Linkedbot — software, branding, design, technology, and content — are the exclusive property of Bhatnagar Digital Labs. Users may not copy, reproduce, distribute, or modify any part without written permission.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">8. Third-Party Services & Automation Disclaimer</h2>
                    <p className="text-muted-foreground mb-2">Linkedbot is an independent software tool and is not affiliated with any third-party platform including LinkedIn. Users are solely responsible for ensuring compliance with third-party platform policies.</p>
                    <p className="text-muted-foreground">We are not responsible for any restrictions, suspensions, or bans imposed by third-party platforms. Users assume all risks associated with connecting accounts and using automation features.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">9–12. Limitation of Liability, Privacy, Changes & Governing Law</h2>
                    <p className="text-muted-foreground mb-2">Linkedbot is provided "as is" and "as available." The Company shall not be liable for any indirect, incidental, or consequential damages.</p>
                    <p className="text-muted-foreground mb-2">Your use is also governed by our <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>.</p>
                    <p className="text-muted-foreground">These Terms shall be governed by the laws of Agra, India. Any disputes shall fall under the jurisdiction of the courts of Agra, India.</p>
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
                    <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact Information</h2>
                    <p className="text-muted-foreground">
                      For any questions regarding these Terms, please contact:<br />
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

export default TermsOfService;
