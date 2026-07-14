import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AdminAuthDialog = ({ open, onOpenChange, onSuccess }: AdminAuthDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    const { data: adm } = await supabase
      .from("cad_administradores")
      .select("id,status")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (!adm) {
      toast.error("E-mail não cadastrado como administrador");
      setIsLoading(false);
      return;
    }
    if ((adm.status ?? "").toLowerCase() !== "ativo") {
      toast.error("Administrador inativo");
      setIsLoading(false);
      return;
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signErr) {
      toast.error("Senha incorreta");
      setIsLoading(false);
      return;
    }

    toast.success("Autenticação bem-sucedida!");
    onSuccess();
    setEmail("");
    setPassword("");
    setIsLoading(false);
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Autenticação Administrativa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Login de Administrador</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="Email do administrador"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              <LogIn className="h-4 w-4 mr-2" />
              {isLoading ? "Verificando..." : "Acessar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
