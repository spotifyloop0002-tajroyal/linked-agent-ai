import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, Shield, Settings, Globe, Bell, Mail } from "lucide-react";

const CookiePolicy = () => {
  usePageTitle("Cookie Policy");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Cookie className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              This Cookie Policy explains how Linkedbot, a product operated by Bhatnagar Digital Labs, uses cookies and similar tracking technologies.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: March 7, 2026</p>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies</h2>
                    <p className="text-muted-foreground mb-2">Cookies are small text files stored on your device when you visit a website. They help websites remember information about your visit, such as:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Login sessions</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>User preferences</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Website performance data</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Security settings</li>
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
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. Types of Cookies We Use</h2>
                    
                    <h3 className="font-semibold text-foreground mt-4 mb-2">Essential Cookies</h3>
                    <p className="text-muted-foreground mb-2">Necessary for the operation of the website: user authentication, account login, security verification, and basic functionality.</p>

                    <h3 className="font-semibold text-foreground mt-4 mb-2">Performance and Analytics Cookies</h3>
                    <p className="text-muted-foreground mb-2">Help us understand how users interact with the platform: pages visited, time spent, feature usage, and error logs.</p>

                    <h3 className="font-semibold text-foreground mt-4 mb-2">Functional Cookies</h3>
                    <p className="text-muted-foreground mb-2">Remember user preferences such as language settings, UI preferences, and saved login sessions.</p>

                    <h3 className="font-semibold text-foreground mt-4 mb-2">Third-Party Cookies</h3>
                    <p className="text-muted-foreground">Linkedbot may use third-party services (analytics providers, payment processors, cloud infrastructure) that place cookies on your device according to their own privacy policies.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Managing Cookies</h2>
                    <p className="text-muted-foreground">Users can control or disable cookies through their browser settings. However, disabling cookies may affect some features of LinkedBot.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Cookie Consent (GDPR Requirement)</h2>
                    <p className="text-muted-foreground mb-2">For users in the EEA or United Kingdom, Linkedbot may display a cookie consent banner allowing you to:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Accept all cookies</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Reject non-essential cookies</li>
                      <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span>Customize cookie preferences</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Updates to This Cookie Policy</h2>
                    <p className="text-muted-foreground">We may update this Cookie Policy from time to time. When updates occur, the revised policy will be posted on this page with the updated Last Updated date.</p>
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
                    <h2 className="text-xl font-semibold text-foreground mb-3">6. Contact Information</h2>
                    <p className="text-muted-foreground">
                      If you have any questions about this Cookie Policy, please contact:<br />
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

export default CookiePolicy;
