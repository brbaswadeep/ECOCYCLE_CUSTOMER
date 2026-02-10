import React, { useRef } from 'react';
import { X, Printer, Download, MapPin, Mail, Phone } from 'lucide-react';
import ecoshopLogo from '../assets/Ecoshop.png'; // Assuming this exists, based on Shop.jsx

export default function InvoiceModal({ order, onClose }) {
    const invoiceRef = useRef();

    const handlePrint = () => {
        const printContent = invoiceRef.current;
        const originalContents = document.body.innerHTML;

        // Create a print-specific style to ensure it looks good
        const printStyle = `
            <style>
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #invoice-print-section, #invoice-print-section * {
                        visibility: visible;
                    }
                    #invoice-print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        background: white;
                        color: black;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        `;

        // We can't easily replace body innerHTML in React without losing state/event listeners.
        // Instead, valid approach is window.print() and using @media print CSS to hide everything else.
        // We'll add the ID to the container and use standard CSS or the specific print-hidden classes.

        window.print();
    };

    if (!order) return null;

    // Calculate totals if not present (legacy orders)
    const priceBreakdown = order.priceBreakdown || {
        subtotal: order.price,
        gst: 0,
        deliveryFee: 0,
        total: order.price
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">

                {/* Header / Actions - Hidden in Print */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:hidden">
                    <h3 className="font-bold text-lg text-brand-brown">Tax Invoice</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-brown text-white rounded-lg hover:bg-brand-black transition text-sm font-bold"
                        >
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div
                    id="invoice-print-section"
                    ref={invoiceRef}
                    className="p-8 md:p-12 overflow-y-auto flex-1 bg-white"
                >
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <div className="text-3xl font-extrabold text-brand-brown tracking-tight mb-2">INVOICE</div>
                            <div className="text-sm text-gray-500 font-medium">#{order.id.slice(0, 8).toUpperCase()}</div>
                            <div className="mt-4 text-sm text-gray-600">
                                <div className="font-bold text-gray-800">Billed To:</div>
                                <div className="capitalize">{order.customerName}</div>
                                <div>{order.customerEmail}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            {/* Logo Placeholder - simplified text if image fails */}
                            <div className="flex items-center justify-end gap-2 mb-4">
                                <img src={ecoshopLogo} alt="EcoCycle" className="h-10 object-contain" />
                                <span className="text-xl font-bold text-brand-green">EcoCycle</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                <p>123 Green Street, Eco City</p>
                                <p>Earth, 40404</p>
                                <p>support@ecocycle.com</p>
                            </div>
                            <div className="mt-6">
                                <div className="text-xs font-bold text-gray-400 uppercase">Date Issued</div>
                                <div className="font-medium text-gray-800">
                                    {order.createdAt?.toDate
                                        ? order.createdAt.toDate().toLocaleDateString()
                                        : new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mb-8">
                        <div className="border-b-2 border-brand-brown mb-4 pb-2 flex gap-4 text-sm font-bold text-brand-brown uppercase tracking-wider">
                            <div className="flex-1">Item Description</div>
                            <div className="w-20 text-center">Qty</div>
                            <div className="w-32 text-right">Price</div>
                            <div className="w-32 text-right">Total</div>
                        </div>

                        {/* Order Item (Assuming single item per order doc as per current schema, adapt if multiple) */}
                        <div className="flex gap-4 py-4 text-sm border-b border-gray-100 items-center">
                            <div className="flex-1">
                                <div className="font-bold text-gray-800">{order.productName || "Eco Friendly Product"}</div>
                                <div className="text-xs text-gray-500">Vendor: {order.vendorName}</div>
                            </div>
                            <div className="w-20 text-center font-medium">{order.quantity || 1}</div>
                            <div className="w-32 text-right text-gray-600">₹{(priceBreakdown.subtotal / (order.quantity || 1)).toFixed(2)}</div>
                            <div className="w-32 text-right font-bold text-gray-800">₹{priceBreakdown.subtotal}</div>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{priceBreakdown.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>GST (18%)</span>
                                <span>₹{priceBreakdown.gst}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery & Handling</span>
                                <span>₹{priceBreakdown.deliveryFee}</span>
                            </div>
                            <div className="flex justify-between font-extrabold text-xl text-brand-brown pt-4 border-t-2 border-brand-brown/10 mt-4">
                                <span>Total</span>
                                <span>₹{priceBreakdown.total}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-20 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
                        <p className="mb-2">Thank you for choosing EcoCycle & supporting sustainable living.</p>
                        <p>This is a computer generated invoice and does not require a signature.</p>
                    </div>
                </div>
            </div>

            {/* Global Print Style Injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #invoice-print-section, #invoice-print-section * {
                        visibility: visible;
                    }
                    #invoice-print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        background: white;
                    }
                }
            `}} />
        </div>
    );
}
