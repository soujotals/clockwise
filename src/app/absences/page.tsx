'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Clock, FileText, Calendar, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { absenceService } from '@/services/absence.service';
import type { AbsenceRequest } from '@/types';

const absenceTypes = [
  { value: 'sick_leave', label: 'Atestado Médico', color: 'bg-red-100 text-red-800' },
  { value: 'vacation', label: 'Férias', color: 'bg-blue-100 text-blue-800' },
  { value: 'personal', label: 'Motivo Pessoal', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'medical_certificate', label: 'Consulta Médica', color: 'bg-green-100 text-green-800' },
  { value: 'maternity', label: 'Licença Maternidade', color: 'bg-pink-100 text-pink-800' },
  { value: 'paternity', label: 'Licença Paternidade', color: 'bg-purple-100 text-purple-800' },
];

const statusConfig = {
  pending: { icon: AlertCircle, label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  approved: { icon: CheckCircle, label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  rejected: { icon: XCircle, label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
  cancelled: { icon: XCircle, label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

export default function AbsencesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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

  const getAbsenceTypeLabel = (type: string) => {
    return absenceTypes.find(t => t.value === type)?.label || type;
  };

  const getAbsenceTypeColor = (type: string) => {
    return absenceTypes.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || isLoading) {
    return (
      <div className="dark bg-background flex min-h-screen items-center justify-center">
        <Clock className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-sans">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="text-xl font-bold ml-4">Solicitações de Ausência</h1>
        </div>
        
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
                        {type.label}
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
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, "PPP", { locale: ptBR }) : "Selecione"}
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
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, "PPP", { locale: ptBR }) : "Selecione"}
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
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full flex-grow animate-in fade-in-0 duration-500">
        {absenceRequests.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Você ainda não fez nenhuma solicitação de ausência.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira solicitação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {absenceRequests.map((request) => {
              const StatusIcon = statusConfig[request.status].icon;
              const startDate = parseISO(request.startDate);
              const endDate = parseISO(request.endDate);
              const isMultipleDays = format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd');

              return (
                <Card key={request.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                                                 <div className="flex items-center gap-2">
                           <div className={`px-2 py-1 rounded-full text-xs font-medium ${getAbsenceTypeColor(request.type)}`}>
                             {getAbsenceTypeLabel(request.type)}
                           </div>
                           <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${statusConfig[request.status].color}`}>
                             <StatusIcon className="h-3 w-3 mr-1" />
                             {statusConfig[request.status].label}
                           </div>
                         </div>
                        <CardTitle className="text-base">
                          {isMultipleDays 
                            ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
                            : format(startDate, "dd/MM/yyyy")
                          }
                        </CardTitle>
                        <CardDescription>
                          {request.hoursAffected}h afetadas • Solicitado em {format(parseISO(request.createdAt), "dd/MM/yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Motivo:</h4>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      </div>
                      
                      {request.status === 'approved' && request.approvedBy && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            ✅ Aprovado em {format(parseISO(request.approvedAt!), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      )}
                      
                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                          <p className="text-sm text-red-800 dark:text-red-200 mb-1">
                            ❌ Rejeitado em {format(parseISO(request.approvedAt!), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Motivo: {request.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}