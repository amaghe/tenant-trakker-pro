import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Send, Loader2 } from "lucide-react";
import { useMtnMomo } from "@/hooks/useMtnMomo";

interface QuickPaymentRequestProps {
  trigger: React.ReactNode;
  phoneNumber: string;
  defaultAmount: number;
  tenantName: string;
  paymentId?: string;
  tenantId?: string;
  onSuccess?: () => void;
}

const QuickPaymentRequest = ({ 
  trigger, 
  phoneNumber, 
  defaultAmount, 
  tenantName, 
  paymentId, 
  tenantId,
  onSuccess 
}: QuickPaymentRequestProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const { loading, createInvoice } = useMtnMomo();

  const handleSendRequest = async () => {
    try {
      const referenceId = await createInvoice({
        paymentId: paymentId || '',
        amount,
        msisdn: phoneNumber,
      });

      if (referenceId) {
        setOpen(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-success" />
            Create Invoice for {tenantName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phoneNumber} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder={`Default: ₦${defaultAmount.toLocaleString()}`}
            />
            <p className="text-xs text-muted-foreground">
              Invoice will be sent to tenant's phone via MTN MoMo.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequest}
              disabled={loading}
              className="bg-success hover:bg-success/90 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPaymentRequest;