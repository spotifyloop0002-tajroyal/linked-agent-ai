import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, Edit, Trash2, Lock, Download, Mail } from "lucide-react";

const GDPR = () => {
  usePageTitle("GDPR Compliance");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">GDPR Compliance</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              If you are a resident of the European Economic Area (EEA) or United Kingdom, you have certain data protection rights under the General Data Protection Regulation.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: March 7, 2026</p>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Right to Access</h2>
                    <p className="text-muted-foreground">You have the right to request copies of your personal data that we hold.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Right to Rectification</h2>
                    <p className="text-muted-foreground">You have the right to request that we correct any information you believe is inaccurate or incomplete.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Right to Erasure</h2>
                    <p className="text-muted-foreground">You have the right to request that we erase your personal data, under certain conditions.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Right to Restrict Processing</h2>
                    <p className="text-muted-foreground">You may request limited processing of your personal data under certain circumstances.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Download className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Right to Data Portability</h2>
                    <p className="text-muted-foreground">You may request your data in a portable format that can be transferred to another service.</p>
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
                    <h2 className="text-xl font-semibold text-foreground mb-3">Data Protection Officer</h2>
                    <p className="text-muted-foreground">
                      For any GDPR-related inquiries, contact:<br />
                      <strong className="text-foreground">Bhatnagar Digital Labs</strong><br />
                      Email: <a href="mailto:Team@linkedbot.online" className="text-primary hover:underline">Team@linkedbot.online</a>
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

export default GDPR;
