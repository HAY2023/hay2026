
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LegalDisclaimerProps {
    userId: string;
    onAccept: () => void;
}

const LegalDisclaimer = ({ userId, onAccept }: LegalDisclaimerProps) => {
    const [loading, setLoading] = useState(false);

    const handleAgree = async () => {
        setLoading(true);
        console.log("Accepting TOS for:", userId);
        try {
            // First check if profile exists
            const { data: profile, error: checkError } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", userId)
                .single();

            if (checkError) {
                console.error("Profile check error:", checkError);
                throw new Error("لم يتم العثور على ملفك الشخصي في قاعدة البيانات.");
            }

            // Perform the update
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ tos_accepted: true })
                .eq("user_id", userId);

            if (updateError) {
                console.error("Update error:", updateError);
                throw updateError;
            }

            toast.success("تم قبول الشروط بنجاح!");
            onAccept();
        } catch (err: any) {
            console.error("Full error object:", err);
            toast.error(`فشل الحفظ: ${err.message || "تأكد من تطبيق كود SQL الموفر لك"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-2xl glass-card overflow-hidden shadow-2xl border-primary/30"
            >
                <div className="gold-gradient h-2 w-full" />
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-4 border-b border-border pb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-heading font-bold gold-text">Terms of Service</h2>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Mandatory Legal Agreement</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar text-sm leading-relaxed text-muted-foreground font-body">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-1" />
                            <p>
                                <strong className="text-foreground">Disclaimer:</strong> The platform is not responsible for any data leaks or account breaches. By continuing, you acknowledge that you are responsible for maintaining the security of your credentials and account data.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <FileText className="w-5 h-5 text-primary shrink-0 mt-1" />
                            <p>
                                <strong className="text-foreground">Waiver:</strong> Users waive the right to any legal action or lawsuits against the platform for technical errors, service issues, or information inaccuracies. All services are provided "as-is" without warranty.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                            <p>
                                <strong className="text-foreground">Support Policy:</strong> The right to technical support expires immediately if a solution is provided or the request is processed, and the site management may refrain from responding to any person without justification or for reasons of ill-treatment.
                            </p>
                        </div>

                        <p className="pt-4 border-t border-border/50 text-center italic text-xs">
                            By clicking "I Agree & Continue", you confirm that you have read, understood, and voluntarily accepted these terms in English.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleAgree}
                            disabled={loading}
                            className="w-full h-14 gold-gradient text-background text-lg font-heading font-bold rounded-2xl shadow-xl shadow-primary/20"
                        >
                            {loading ? "Processing..." : "I Agree & Continue"}
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                            Agreement date: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LegalDisclaimer;
