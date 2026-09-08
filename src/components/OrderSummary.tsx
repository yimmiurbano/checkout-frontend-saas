import React from 'react';

interface LineItem {
  name: string;
  description?: string;
  quantity: number;
  unitAmount: number;
}

interface OrderSummaryProps {
  lineItems: LineItem[];
  subtotal: number;
  totalAmount: number;
  taxAmount?: number;
  taxLabel?: string;
  currency: string;
  companyName: string;
  logoUrl?: string;
  isTestMode?: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ lineItems, subtotal, totalAmount, taxAmount, taxLabel, currency, companyName, logoUrl, isTestMode = true }) => {
  const formatMoney = (amount: number) => {
    const locales: Record<string, string> = {
      'PEN': 'es-PE',
      'USD': 'en-US',
      'EUR': 'de-DE'
    };
    const locale = locales[currency.toUpperCase()] || 'es-PE';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(amount / 100);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        {logoUrl ? (
          <>
            <img src={logoUrl} alt={companyName} style={{ height: '52px', borderRadius: '4px' }} />
            {isTestMode && (
              <span style={{ fontSize: '0.75rem', backgroundColor: '#fde68a', color: '#92400e', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', fontWeight: 600 }}>
                MODO PRUEBA
              </span>
            )}
          </>
        ) : (
          <>
            <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--text-left)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{companyName.charAt(0)}</span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {companyName} 
              {isTestMode && (
                <span style={{ fontSize: '0.75rem', backgroundColor: '#fde68a', color: '#92400e', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle' }}>
                  MODO PRUEBA
                </span>
              )}
            </h1>
          </>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-left-muted)', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Resumen de tu compra</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{formatMoney(totalAmount)}</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {lineItems.map((item, index) => (
          <div key={index} className="summary-item">
            <div className="summary-item-left">
              <div className="summary-item-icon">
                {/* SVG Icon Placeholder */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              </div>
              <div>
                <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{item.name}</p>
                {item.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-left-muted)', marginTop: '0.15rem' }}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>
            <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{formatMoney(item.unitAmount * item.quantity)}</p>
          </div>
        ))}
      </div>

      <div className="summary-divider"></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
        <p style={{ color: 'var(--text-left-muted)' }}>Subtotal</p>
        <p style={{ fontWeight: 500 }}>{formatMoney(subtotal)}</p>
      </div>
      
      {taxAmount && taxAmount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
          <p style={{ color: 'var(--text-left-muted)' }}>Impuesto ({taxLabel})</p>
          <p style={{ fontWeight: 500 }}>{formatMoney(taxAmount)}</p>
        </div>
      )}
      
      <div className="summary-divider"></div>

      <div className="total-due-row" style={{ fontSize: '1rem' }}>
        <p>Total a pagar hoy</p>
        <p>{formatMoney(totalAmount)}</p>
      </div>
    </div>
  );
};

export default OrderSummary;
