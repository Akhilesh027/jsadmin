import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { tickets, formatDate, type Ticket } from '@/data/dummyData';
import { MessageSquare, Send, X, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TicketSystemProps {
  panelType: 'pap-manufacturer' | 'pap-vendor' | 'eap';
  ticketType: 'manufacturer' | 'vendor' | 'customer';
  supportEmail: string;
}

export default function TicketSystem({ panelType, ticketType, supportEmail }: TicketSystemProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  const filteredTickets = tickets.filter((t) => t.createdByType === ticketType);

  const handleReply = () => {
    toast({
      title: 'Reply Sent',
      description: 'Your response has been sent to the user.',
    });
    setReplyMessage('');
    setReplyModalOpen(false);
  };

  const handleClose = (ticket: Ticket) => {
    toast({
      title: 'Ticket Closed',
      description: `Ticket ${ticket.ticketNumber} has been closed.`,
    });
  };

  const title = ticketType === 'manufacturer' ? 'Manufacturer Tickets' : 
                ticketType === 'vendor' ? 'Vendor Tickets' : 'Customer Tickets';

  return (
    <AdminLayout panelType={panelType} title={title} subtitle={`Support email: ${supportEmail}`}>
      <div className="flex items-center gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {ticketType === 'manufacturer' ? 'Manufacturers' : ticketType === 'vendor' ? 'Vendors' : 'Customers'} send issues to:
        </span>
        <a href={`mailto:${supportEmail}`} className="text-primary font-medium">
          {supportEmail}
        </a>
      </div>

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="bg-card rounded-xl border border-border p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-medium text-primary">{ticket.ticketNumber}</span>
                  <StatusBadge status={ticket.status} />
                  <StatusBadge status={ticket.priority} variant="priority" />
                </div>
                <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {ticket.createdBy} • {formatDate(ticket.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setReplyModalOpen(true);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                {ticket.status !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClose(ticket)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                )}
              </div>
            </div>

            <p className="text-muted-foreground mb-4">{ticket.description}</p>

            {/* Message Thread */}
            <div className="border-t pt-4 space-y-3">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg max-w-[80%]',
                    msg.senderType === 'admin' ? 'bg-primary/10 ml-auto' : 'bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{msg.sender}</span>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tickets found</p>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Ticket</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedTicket.ticketNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedTicket.subject}</p>
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Type your response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleReply}>
              <Send className="h-4 w-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

export function ManufacturerTickets() {
  return (
    <TicketSystem
      panelType="pap-manufacturer"
      ticketType="manufacturer"
      supportEmail="manufacturesupport@jsgallor.com"
    />
  );
}

export function VendorTickets() {
  return (
    <TicketSystem
      panelType="pap-vendor"
      ticketType="vendor"
      supportEmail="vendorsupport@jsgallor.com"
    />
  );
}

export function CustomerTickets() {
  return (
    <TicketSystem
      panelType="eap"
      ticketType="customer"
      supportEmail="consumersupport@jsgallor.com"
    />
  );
}
