import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Loader2 } from 'lucide-react';

// ISO/IEC 27001 — A.9.4.3 Password management system:
// senhas fortes (tamanho mínimo, complexidade) e proteção contra força bruta.
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(1, 'Informe a senha').max(72, 'Senha muito longa'),
});

const signupSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z
    .string()
    .min(10, 'A senha deve ter no mínimo 10 caracteres')
    .max(72, 'Senha muito longa')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter ao menos um número')
    .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um caractere especial'),
});

// ISO/IEC 27001 — A.9.4.2: proteção contra tentativas repetidas.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min
const ATTEMPTS_KEY = 'auth_attempts_v1';

type AttemptState = { count: number; lockedUntil: number };
function readAttempts(): AttemptState {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '') as AttemptState;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}
function writeAttempts(s: AttemptState) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(s));
}
function clearAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}

const ALLOWED_EMAILS = [
  'serdepaz@gmail.com',
  'luciano.ribeiro@irmadulceoficial.com.br',
  'avaliacoesdulce@gmail.com',
];
const EXCLUSIVE_MSG =
  'Esse aplicativo é exclusivo para os professores da Escola Irmã Dulce';

async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (ALLOWED_EMAILS.includes(normalized)) return true;
  const { data } = await supabase
    .from('cad_professores')
    .select('id')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();
  return !!data;
}

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bloqueio temporário após tentativas excessivas
    const attempts = readAttempts();
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const mins = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      setError(`Muitas tentativas. Tente novamente em ${mins} min.`);
      return;
    }

    // Validação de entrada (regras mais rigorosas no cadastro)
    const schema = isLogin ? loginSchema : signupSchema;
    const validation = schema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const allowed = await isEmailAllowed(email);
      if (!allowed) {
        setError(EXCLUSIVE_MSG);
        setIsSubmitting(false);
        return;
      }

      const { error: authError } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (authError) {
        // Mensagens genéricas evitam enumeração de usuários (ISO 27001 A.9.4.2)
        const msg = authError.message || '';
        if (msg.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login.');
        } else if (msg.toLowerCase().includes('pwned') || msg.toLowerCase().includes('compromised')) {
          setError('Esta senha foi exposta em vazamentos públicos. Escolha outra.');
        } else if (isLogin) {
          const next = { count: attempts.count + 1, lockedUntil: 0 };
          if (next.count >= MAX_ATTEMPTS) {
            next.lockedUntil = Date.now() + LOCKOUT_MS;
            setError(`Muitas tentativas. Conta bloqueada por 15 minutos.`);
          } else {
            setError('Credenciais inválidas.');
          }
          writeAttempts(next);
        } else {
          setError('Não foi possível concluir o cadastro. Verifique os dados.');
        }
      } else {
        clearAttempts();
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Diário de Classe</CardTitle>
          <CardDescription>
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="professor@escola.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                maxLength={72}
              />
              {capsLock && (
                <p className="text-xs text-amber-600">Caps Lock está ativado.</p>
              )}
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Mín. 10 caracteres com maiúscula, minúscula, número e símbolo.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AuthPage;
