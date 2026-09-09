import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import OrderSummary from '../components/OrderSummary';
import PaymentForm from '../components/PaymentForm';
import { API_URL } from '../config';

interface SessionData {
  id: string;
  lineItems: any[];
  currency: string;
  subtotal: number;
  totalAmount: number;
  status: string;
  companyId: string;
  successUrl: string;
  cancelUrl: string;
  customerData?: Record<string, any>;
}

interface CompanyData {
  name: string;
  branding: { primaryColor: string; logoUrl?: string };
  publicApiKey: string;
  paymentGateways?: any[];
  isTestMode?: boolean;
}

const Checkout: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (isPaid && session?.successUrl) {
      const timer = setTimeout(() => {
        window.location.href = session.successUrl;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPaid, session]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/sessions/${sessionId}`);
        setSession(response.data.session);
        setCompany(response.data.company);
        setConfig(response.data.config);
        
        // Apply company branding to CSS vars
        if (response.data.company?.branding?.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', response.data.company.branding.primaryColor);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error loading session');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handlePaymentSuccess = async (paymentId: string, customerData: Record<string, any>) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/sessions/${sessionId}/pay`, {
        sourceId: paymentId,
        email: customerData.email || 'customer@example.com',
        customerData
      });
      setIsPaid(true);
    } catch (err: any) {
      alert(`Error al procesar el pago: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="left-panel"></div>
        <div className="right-panel"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', color: '#000' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'red', marginBottom: '1rem' }}>Error</h2>
          <p>{error || 'Sesión no encontrada o expirada.'}</p>
        </div>
      </div>
    );
  }

  // Calculate taxes if configured
  let finalTotal = session.totalAmount;
  let taxAmount = 0;
  let taxLabel = '';

  if (config?.taxes && config.taxes.length > 0) {
    const tax = config.taxes[0]; // Take first tax rate for simplicity (e.g. IGV 18%)
    taxAmount = session.subtotal * tax.percentage;
    finalTotal = session.subtotal + taxAmount;
    taxLabel = tax.name;
  }

  const culqiGateway = company?.paymentGateways?.find((gateway: any) => gateway.gateway === 'culqi' && gateway.isActive);
  const culqiPublicKey = culqiGateway?.publicKey || company?.publicApiKey || '';

  return (
    <div className="app-container">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className="left-panel-content">
          <OrderSummary 
            lineItems={session.lineItems} 
            subtotal={session.subtotal} 
            totalAmount={finalTotal}
            taxAmount={taxAmount}
            taxLabel={taxLabel}
            currency={session.currency}
            companyName={company?.name || 'Empresa Demo'}
            logoUrl={company?.branding?.logoUrl}
            isTestMode={company?.isTestMode}
          />
        </div>
      </div>
      
      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="right-panel-content">
          {isPaid ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a1a24', marginBottom: '1rem' }}>¡Gracias por tu compra!</h2>
              <p style={{ fontSize: '0.9375rem', color: '#6b7280', marginBottom: '2rem', lineHeight: '1.5' }}>
                Tu pago ha sido procesado con éxito. En unos segundos serás redirigido de vuelta al sitio web del curso.
              </p>
              <a href={session.successUrl} className="btn-primary" style={{ textDecoration: 'none' }}>
                Volver ahora
              </a>
            </div>
          ) : (
            <>
              {session?.cancelUrl && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <a href={session.cancelUrl} style={{ fontSize: '0.875rem', color: 'var(--text-right-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    &larr; Cancelar y volver
                  </a>
                </div>
              )}
              <PaymentForm 
                amount={finalTotal} 
                currency={session.currency}
                onSuccess={handlePaymentSuccess}
                publicApiKey={culqiPublicKey}
                companyName={company?.name || 'Checkout'}
                companyId={session.companyId}
                config={config}
                paymentGateways={company?.paymentGateways}
                initialCustomerData={session.customerData}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
