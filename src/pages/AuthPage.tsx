import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Loader2 } from 'lucide-react';

const authSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(72, 'Senha muito longa'),
});

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: authError } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (authError) {
        // Handle common error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (authError.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login.');
        } else {
          setError(authError.message);
        }
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
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
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
