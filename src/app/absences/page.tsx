'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Clock, FileText, Calendar, CheckCircle, XCircle, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { absenceService } from '@/services/absence.service';
import type { AbsenceRequest } from '@/types';

const absenceTypes = [
  { value: 'sick_leave', label: 'Atestado Médico', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', emoji: '🏥' },
  { value: 'vacation', label: 'Férias', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', emoji: '🏖️' },
  { value: 'personal', label: 'Motivo Pessoal', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', emoji: '👤' },
  { value: 'medical_certificate', label: 'Consulta Médica', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', emoji: '👨‍⚕️' },
  { value: 'maternity', label: 'Licença Maternidade', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', emoji: '🤱' },
  { value: 'paternity', label: 'Licença Paternidade', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', emoji: '👨‍👶' },
];

const statusConfig = {
  pending: { icon: AlertCircle, label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', emoji: '⏳' },
  approved: { icon: CheckCircle, label: 'Aprovada', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', emoji: '✅' },
  rejected: { icon: XCircle, label: 'Rejeitada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', emoji: '❌' },
  cancelled: { icon: XCircle, label: 'Cancelada', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', emoji: '🚫' },
};

export default function AbsencesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    type: '',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const requests = await absenceService.getUserRequests(user.uid);
        setAbsenceRequests(requests);
      } catch (error) {
        console.error('Error fetching absence requests:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as solicitações.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleSubmit = async () => {
    if (!user || !formData.type || !formData.reason.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.endDate < formData.startDate) {
      toast({
        title: "Datas inválidas",
        description: "A data de fim deve ser posterior à data de início.",
        variant: "destructive",
      });
      return;
    }

    try {
      const hoursAffected = absenceService.calculateHoursAffected(
        formData.startDate.toISOString(),
        formData.endDate.toISOString()
      );

      const newRequest = await absenceService.createRequest(user.uid, {
        userId: user.uid,
        type: formData.type as any,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        reason: formData.reason,
        status: 'pending',
        hoursAffected,
      });

      setAbsenceRequests(prev => [newRequest, ...prev]);
      setIsDialogOpen(false);
      setFormData({
        type: '',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
      });

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de ausência foi enviada para aprovação.",
      });
    } catch (error) {
      console.error('Error creating absence request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    }
  };

  const getAbsenceTypeData = (type: string) => {
    return absenceTypes.find(t => t.value === type) || { label: type, color: 'bg-gray-100 text-gray-800', emoji: '📋' };
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  // Mobile form component
  const MobileForm = () => (
    <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="w-full h-14 text-lg font-semibold shadow-lg">
          <Plus className="h-5 w-5 mr-3" />
          Nova Solicitação
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-6">
          <SheetTitle className="text-xl">Nova Solicitação</SheetTitle>
          <SheetDescription>
            Preencha os dados da sua solicitação de ausência
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 pb-20">
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Ausência</Label>
            <Select value={formData.type} onValueChange={(value: string) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {absenceTypes.map(type => (
                  <SelectItem key={type.value} value={type.value} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{type.emoji}</span>
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal text-base"
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    {formData.startDate ? format(formData.startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date: Date | undefined) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Data de Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal text-base"
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    {formData.endDate ? format(formData.endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date: Date | undefined) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Motivo</Label>
            <Textarea
              placeholder="Descreva o motivo da ausência..."
              value={formData.reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
              className="text-base resize-none"
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-12">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 h-12 font-semibold">
              Enviar Solicitação
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  if (authLoading || isLoading) {
    return (
      <div className="dark bg-background flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="animate-spin h-10 w-10 text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-sans">
      {/* Header otimizado para mobile */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center min-w-0">
            <Button variant="ghost" size="icon" asChild className="mr-2 shrink-0">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <h1 className="text-lg font-bold truncate">Ausências</h1>
          </div>
          
          {/* Desktop dialog, mobile sheet */}
          <div className="hidden sm:block">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nova Solicitação de Ausência</DialogTitle>
                  <DialogDescription>
                    Preencha os dados da sua solicitação. Ela será enviada para aprovação.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Ausência</Label>
                    <Select value={formData.type} onValueChange={(value: string) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {absenceTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.emoji} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Início</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.startDate ? format(formData.startDate, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formData.startDate}
                            onSelect={(date: Date | undefined) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Data de Fim</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.endDate ? format(formData.endDate, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formData.endDate}
                            onSelect={(date: Date | undefined) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo</Label>
                    <Textarea
                      id="reason"
                      placeholder="Descreva o motivo da ausência..."
                      value={formData.reason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    Enviar Solicitação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-safe">
        {/* Mobile floating action button */}
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
          <MobileForm />
        </div>

        {absenceRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma solicitação</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Você ainda não fez nenhuma solicitação de ausência. Comece criando sua primeira solicitação.
            </p>
            <div className="sm:hidden w-full">
              <MobileForm />
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-20 sm:pb-4">
            {absenceRequests.map((request) => {
              const typeData = getAbsenceTypeData(request.type);
              const statusData = statusConfig[request.status];
              const startDate = parseISO(request.startDate);
              const endDate = parseISO(request.endDate);
              const isMultipleDays = format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd');
              const isExpanded = expandedCards.has(request.id);

              return (
                <Card key={request.id} className="transition-all hover:shadow-md active:scale-[0.98] cursor-pointer" onClick={() => toggleCardExpansion(request.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${typeData.color}`}>
                            <span>{typeData.emoji}</span>
                            <span className="hidden xs:inline">{typeData.label}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusData.color}`}>
                            <span>{statusData.emoji}</span>
                            <span>{statusData.label}</span>
                          </div>
                        </div>
                        <CardTitle className="text-base leading-tight">
                          {isMultipleDays 
                            ? `${format(startDate, "dd/MM/yy")} - ${format(endDate, "dd/MM/yy")}`
                            : format(startDate, "dd/MM/yyyy")
                          }
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {request.hoursAffected}h • {format(parseISO(request.createdAt), "dd/MM/yyyy")}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Motivo:</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                          {request.reason}
                        </p>
                      </div>
                      
                      {request.status === 'approved' && request.approvedBy && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            ✅ Aprovado em {format(parseISO(request.approvedAt!), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      )}
                      
                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                            ❌ Rejeitado em {format(parseISO(request.approvedAt!), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Motivo: {request.rejectionReason}
                          </p>
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⏳ Aguardando aprovação desde {format(parseISO(request.createdAt), "dd/MM/yyyy")}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}