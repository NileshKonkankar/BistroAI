import { jsPDF } from 'jspdf';

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

export interface InvoiceOrder {
  id: string;
  createdAt: any;
  items: InvoiceItem[];
  totalAmount: number;
  tableNumber?: string | number;
  type?: string;
  customerEmail?: string;
}

const getFormattedDate = (createdAt: any) => {
  if (!createdAt) return new Date().toLocaleString();
  if (createdAt.seconds) {
    return new Date(createdAt.seconds * 1000).toLocaleString();
  }
  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate().toLocaleString();
  }
  return new Date(createdAt).toLocaleString();
};

export function generateInvoicePDF(order: InvoiceOrder) {
  // Create a standard A4 portrait PDF document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Colors based on modern palette (Zinc-900: #18181b, Brand Sage/Orange: #f97316)
  const primaryColor = [24, 24, 27]; // #18181b
  const secondaryColor = [113, 113, 122]; // #71717a
  const accentColor = [249, 115, 22]; // #f97316 (Orange-500)
  const lightBgColor = [250, 250, 250]; // #fafafa
  const borderColor = [228, 228, 231]; // #e4e4e7

  // Add decorative top color accent block
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, 210, 4, 'F');

  // --- HEADER SECTION ---
  // Left: Bistro AI branding
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('BISTRO AI', 16, 20);

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Smart Culinary Experience & Dispensing Engine', 16, 25);
  doc.text('100 Gastronomy Way, Silicon Valley, CA 94025', 16, 29);
  doc.text('Tel: (555) 832-7235 | support@bistro.ai', 16, 33);

  // Right: INVOICE header details
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INVOICE', 194, 20, { align: 'right' });

  // Document details
  const formattedDate = getFormattedDate(order.createdAt);
  const displayId = order.id ? order.id.slice(-6).toUpperCase() : 'UNKNOWN';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  doc.text(`Invoice ID:`, 140, 26);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`#BST-${displayId}`, 194, 26, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Date & Time:`, 140, 31);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(formattedDate, 194, 31, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Payment Status:`, 140, 36);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(34, 197, 94); // Green color
  doc.text('PAID (Via Cloud Portal)', 194, 36, { align: 'right' });

  // Draw dividing line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(16, 42, 194, 42);

  // --- CLIENT & ORDER BILLING ---
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILLING DETAILS', 16, 50);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  
  const customerEmail = order.customerEmail || 'Guest Diner (Walk-in)';
  doc.text(`Customer: ${customerEmail}`, 16, 56);
  
  const fulfillmentType = order.tableNumber ? `Table Service (Table #${order.tableNumber})` : `Takeout Order`;
  doc.text(`Fulfillment: ${fulfillmentType}`, 16, 61);
  doc.text(`Service Provider: AI Automated Bistro Kitchen`, 16, 66);

  // --- DATA TABLE HEADER ---
  let startY = 76;
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(16, startY, 178, 8, 'F');
  doc.rect(16, startY, 178, 8, 'S'); // thin border

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  doc.text('MENU ITEM DESCRIPTION', 20, startY + 5.5);
  doc.text('QTY', 115, startY + 5.5, { align: 'center' });
  doc.text('UNIT PRICE', 145, startY + 5.5, { align: 'right' });
  doc.text('TOTAL AMOUNT', 190, startY + 5.5, { align: 'right' });

  // --- DATA TABLE ITEMS ---
  let currentY = startY + 8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  order.items?.forEach((item, index) => {
    // Alternating background for legibility
    if (index % 2 === 1) {
      doc.setFillColor(252, 252, 252);
      doc.rect(16, currentY, 178, 8.5, 'F');
    }

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    
    // Dish Name
    doc.text(item.name || 'Unnamed Dish', 20, currentY + 5.5);
    
    // Qty
    doc.setFont('Helvetica', 'normal');
    doc.text(String(item.qty || 1), 115, currentY + 5.5, { align: 'center' });
    
    // Unit Price & Total
    const priceStr = `$${(item.price || 0).toFixed(2)}`;
    const lineTotalStr = `$${((item.price || 0) * (item.qty || 1)).toFixed(2)}`;
    
    doc.text(priceStr, 145, currentY + 5.5, { align: 'right' });
    
    doc.setFont('Helvetica', 'bold');
    doc.text(lineTotalStr, 190, currentY + 5.5, { align: 'right' });

    // Item note underneath if exists
    if (item.notes && item.notes.trim() !== '') {
      currentY += 8.5;
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(`  * Note: ${item.notes}`, 20, currentY + 3.5);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
    }

    currentY += 8.5;
  });

  // Bottom table line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(16, currentY, 194, currentY);

  // --- SUMMARY FEES SECTION ---
  currentY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  const rawSubtotal = order.totalAmount / 1.0825; // Estimate subtotal before tax back-calculation
  const calcedTax = order.totalAmount - rawSubtotal;

  doc.text('Fulfillment Subtotal:', 140, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`$${rawSubtotal.toFixed(2)}`, 190, currentY, { align: 'right' });

  currentY += 5;
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Calculated Tax (8.25%):', 140, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`$${calcedTax.toFixed(2)}`, 190, currentY, { align: 'right' });

  currentY += 6;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(140, currentY - 2, 194, currentY - 2);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GRAND TOTAL (USD):', 140, currentY + 2);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`$${(order.totalAmount || 0).toFixed(2)}`, 190, currentY + 2, { align: 'right' });

  // --- ADDTIONAL POLISHED TOUCHES / NOTES ---
  doc.setLineWidth(0.4);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  
  // Clean decorative dashed box for standard legal disclaimers / culinary policy
  const boxTop = currentY + 12;
  doc.rect(16, boxTop, 178, 26);
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('IMPORTANT DIETARY & HEALTH NOTICE:', 20, boxTop + 5);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('If you or any of your guests have food allergies or strict dietary restrictions, please register them in your Bistro AI', 20, boxTop + 9);
  doc.text('Preference Profile. Our kitchen algorithms cross-reference raw ingredients with active order profiles to mitigate hazard.', 20, boxTop + 13);
  doc.text('This invoice acts as confirmation of digital culinary fulfillment and automatic secure ledger registration.', 20, boxTop + 17);
  doc.text('Thank you for choosing Bistro AI. We look forward to your next customized, algorithmically perfect meal!', 20, boxTop + 22);

  // Footer label
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('~ Transformed from raw ingredients to pure code with Bistro AI ~', 105, boxTop + 34, { align: 'right' });

  // Save the PDF Invoice download
  doc.save(`BistroAI_Invoice_BST-${displayId}.pdf`);
}
