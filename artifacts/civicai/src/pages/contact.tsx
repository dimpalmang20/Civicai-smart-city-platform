import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, Phone, MapPin, Send, Loader2, Shield, Users, MessageCircle } from "lucide-react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contact Us</h1>
        <p className="text-muted-foreground mt-1">Get in touch with the CivicAI team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Mail className="h-5 w-5" />, label: "Email", value: "support@civicai.in", color: "text-primary" },
          { icon: <Phone className="h-5 w-5" />, label: "Phone", value: "+91 11 2345 6789", color: "text-accent" },
          { icon: <MapPin className="h-5 w-5" />, label: "Office", value: "New Delhi, India", color: "text-blue-600" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 bg-muted rounded-lg ${item.color}`}>{item.icon}</div>
                <div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="font-medium text-sm text-foreground">{item.value}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Send us a Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-bold text-foreground">Message Sent!</h3>
                <p className="text-sm text-muted-foreground mt-1">We'll get back to you within 24 hours.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="mt-1" required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="mt-1" required />
                  </div>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" className="mt-1" required />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe your query or feedback..." className="mt-1" rows={4} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Message
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="font-semibold text-foreground">About CivicAI</div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CivicAI is an AI-powered platform that empowers Indian citizens to report civic issues.
                Our AI detects problems, routes complaints to the right authority, and rewards active contributors.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div className="font-semibold text-foreground">For Authorities</div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Municipality officials, PWD engineers, and department heads can access the authority panel to manage assigned complaints.
              </p>
              <div className="space-y-1">
                <Badge variant="outline" className="block w-fit text-xs">municipality@civicai.in</Badge>
                <Badge variant="outline" className="block w-fit text-xs">pwd@civicai.in</Badge>
                <Badge variant="outline" className="block w-fit text-xs">electricity@civicai.in</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-foreground mb-1">Working Hours</p>
              <p className="text-xs text-muted-foreground">Monday – Saturday: 9 AM – 6 PM IST</p>
              <p className="text-xs text-muted-foreground">Emergency issues reported on the platform are monitored 24/7</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
