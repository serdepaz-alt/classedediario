import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminPasswordDialog = ({ open, onOpenChange }: AdminPasswordDialogProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    // Acesso legado irrestrito
    if (cleanEmail === "luciano.ribeiro@irmadulceoficial.com.br" && password === "202600") {
      sessionStorage.removeItem("admin_cronograma_only");
      toast.success("Acesso administrativo irrestrito liberado!");
      onOpenChange(false);
      setEmail("");
      setPassword("");
      setIsLoading(false);
      navigate("/admin");
      return;
    }

    // 1) Confirma que o e-mail pertence a um administrador cadastrado e ativo
    const { data: adm, error: admErr } = await supabase
      .from("cad_administradores")
      .select("id,status")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (admErr || !adm) {
      setError("E-mail não cadastrado como administrador");
      toast.error("E-mail não cadastrado como administrador");
      setIsLoading(false);
      return;
    }
    if ((adm.status ?? "").toLowerCase() !== "ativo") {
      setError("Administrador inativo");
      toast.error("Administrador inativo");
      setIsLoading(false);
      return;
    }

    // 2) Valida a senha individual do administrador
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signErr) {
      setError("Senha incorreta");
      toast.error("Senha incorreta");
      setIsLoading(false);
      return;
    }

    toast.success("Acesso administrativo liberado!");
    sessionStorage.removeItem("admin_cronograma_only");
    onOpenChange(false);
    setEmail("");
    setPassword("");
    setIsLoading(false);
    navigate("/admin");
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Acesso Administrativo
          </DialogTitle>
          <DialogDescription>
            Digite as credenciais para acessar o módulo administrativo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Login de Administrador</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="Email do administrador"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="pl-10 pr-10"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
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
