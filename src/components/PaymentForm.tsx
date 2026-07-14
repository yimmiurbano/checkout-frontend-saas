import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

declare global {
  interface Window {
    Culqi: any;
    culqi: () => void;
  }
}

interface PaymentFormProps {
  amount: number;
  currency: string;
  onSuccess: (paymentId: string, customerData: Record<string, any>) => void;
  publicApiKey: string;
  companyName: string;
  companyId: string;
  config: any; // CheckoutConfig
  paymentGateways?: any[];
}

const PaymentForm: React.FC<PaymentFormProps> = ({ amount, currency, onSuccess, publicApiKey, companyName, companyId, config, paymentGateways = [] }) => {
  const isCulqiActive = paymentGateways.length === 0 || paymentGateways.some((g: any) => g.gateway === 'culqi' && g.isActive);
  const isCashAppActive = paymentGateways.some((g: any) => g.gateway === 'cashapp' && g.isActive);

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  
  useEffect(() => {
    if (isCulqiActive) {
      setSelectedMethod('culqi');
    } else if (isCashAppActive) {
      setSelectedMethod('cashapp');
    }
  }, [isCulqiActive, isCashAppActive]);

  const [email, setEmail] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerData, setCustomerData] = useState<Record<string, any>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (window.Culqi && publicApiKey) {
      window.Culqi.publicKey = publicApiKey;
      window.Culqi.settings({
        title: companyName,
        currency: currency,
        amount: amount,
      });
      window.Culqi.options({
        lang: 'auto',
        modal: true,
      });
    }

    window.culqi = () => {
      if (window.Culqi.token) {
        const token = window.Culqi.token.id;
        console.log('Culqi Token generated:', token);
        onSuccess(token, customerData);
      } else if (window.Culqi.order) {
      } else {
        console.error('Culqi error:', window.Culqi.error);
        setIsProcessing(false);
        alert(window.Culqi.error?.user_message || 'Hubo un error al generar el token de pago.');
      }
    };
  }, [publicApiKey, amount, currency, companyName, onSuccess, customerData]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newEmail && newEmail.includes('@')) {
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await axios.get(`${API_URL}/api/customers?email=${newEmail}&companyId=${companyId}`);
          if (res.data && res.data.customFields) {
            setCustomerData(res.data.customFields);
          }
        } catch (error) {
          console.error("Error fetching customer", error);
        }
      }, 500); // 500ms debounce
    }
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomerData(prev => ({ ...prev, [key]: value }));
  };

  const handlePay = () => {
    if (!customerData.fullName) {
      alert('Por favor, ingresa tu nombre y apellido.');
      return;
    }

    if (!email) {
      alert('Por favor, ingresa tu correo electrónico.');
      return;
    }

    // Validate required custom fields
    if (config?.customFields) {
      for (const field of config.customFields) {
        if (field.required && !customerData[field.name]) {
          alert(`El campo ${field.label} es obligatorio.`);
          return;
        }
      }
    }

    if (!selectedMethod) {
      alert('Por favor selecciona un método de pago.');
      return;
    }
    
    if (selectedMethod === 'culqi') {
      setIsProcessing(true);
      window.Culqi.open();
      
      const interval = setInterval(() => {
          if (!window.Culqi.isOpen) {
              setIsProcessing(false);
              clearInterval(interval);
          }
      }, 500);
    } else {
      alert(`El método de pago ${selectedMethod} aún no está implementado.`);
    }
  };

  const billingFields = config?.customFields?.filter((field: any) => field.name !== 'phoneNumber') || [];

  return (
    <div>
      <div className="form-section">
        <h3 className="form-section-title">Información de contacto</h3>
        <div className="input-group-stacked">
          <div className="stacked-row">
            <input 
              type="text" 
              className="stacked-input" 
              placeholder="Nombre y apellido" 
              value={customerData.fullName || ''}
              onChange={(e) => handleCustomFieldChange('fullName', e.target.value)}
              required 
            />
          </div>
          <div className="stacked-row">
            <input 
              type="email" 
              className="stacked-input" 
              placeholder="Correo electrónico" 
              value={email}
              onChange={handleEmailChange}
              required 
            />
          </div>
          <div className="stacked-row">
            <input 
              type="text" 
              className="stacked-input" 
              placeholder="Teléfono" 
              value={customerData.phoneNumber || ''}
              onChange={(e) => handleCustomFieldChange('phoneNumber', e.target.value)}
              required 
            />
          </div>
        </div>
      </div>

      {((billingFields.length > 0) || (config?.ubigeoLevels && config.ubigeoLevels.length > 0)) && (
        <div className="form-section">
          <h3 className="form-section-title">Dirección de facturación</h3>
          <div className="input-group-stacked">
            {billingFields.map((field: any, idx: number) => (
              <div className="stacked-row" key={`field-${idx}`}>
                {field.type === 'select' ? (
                  <select 
                    className="stacked-input" 
                    value={customerData[field.name] || ''} 
                    onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                  >
                    <option value="">{field.label}</option>
                    {field.options?.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    className="stacked-input"
                    value={customerData[field.name] || ''}
                    onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
            
            {config.ubigeoLevels?.map((ubigeo: any, idx: number) => (
              <div className="stacked-row" key={`ubigeo-${idx}`}>
                <input 
                  type="text" 
                  className="stacked-input" 
                  placeholder={ubigeo.name}
                  value={customerData[`ubigeo_${ubigeo.name.toLowerCase()}`] || ''}
                  onChange={(e) => handleCustomFieldChange(`ubigeo_${ubigeo.name.toLowerCase()}`, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-section">
        <h3 className="form-section-title">Método de pago</h3>
        <div className="payment-methods-container">
          {isCulqiActive && (
            <label className={`payment-method-row ${selectedMethod === 'culqi' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="culqi" 
                checked={selectedMethod === 'culqi'} 
                onChange={(e) => setSelectedMethod(e.target.value)} 
              />
              <div className="payment-method-label">Tarjeta</div>
              <div className="payment-method-icons">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none"><rect width="32" height="20" rx="3" fill="#1A1F71"/><path d="M12.5 14L14.8 6H17.2L14.9 14H12.5ZM21.7 6C20.5 6 19.5 6.6 19.5 6.6L19.9 8.2C20.5 7.8 21.2 7.6 21.8 7.6C22.6 7.6 22.9 8 22.9 8.5C22.9 10.3 19.6 10.1 19.6 12.5C19.6 13.6 20.6 14.2 21.8 14.2C22.8 14.2 23.6 13.7 23.6 13.7L23.2 12C22.6 12.4 21.8 12.6 21.2 12.6C20.6 12.6 20.2 12.2 20.2 11.7C20.2 10.2 23.6 10.2 23.6 8C23.6 6.8 22.7 6 21.7 6ZM28 6H26.2C25.5 6 25 6.4 24.8 7.1L21.4 14H24L24.5 12.5H27.7L28 14H30.5L28 6ZM25.2 10.8L26.4 7.6H26.5L27.2 10.8H25.2ZM11.1 6L8.8 11.5L8.4 9.4C8 8.1 6.8 6.6 4.9 6H4.8L8.1 14H10.7L13.8 6H11.1Z" fill="white"/></svg>
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none"><rect width="32" height="20" rx="3" fill="#252525"/><circle cx="12" cy="10" r="6" fill="#EB001B"/><circle cx="20" cy="10" r="6" fill="#F79E1B"/><path d="M16 14.2C14.7 13.2 13.9 11.7 13.9 10C13.9 8.3 14.7 6.8 16 5.8C17.3 6.8 18.1 8.3 18.1 10C18.1 11.7 17.3 13.2 16 14.2Z" fill="#FF5F00"/></svg>
              </div>
            </label>
          )}

          {isCashAppActive && (
            <label className={`payment-method-row ${selectedMethod === 'cashapp' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="cashapp" 
                checked={selectedMethod === 'cashapp'} 
                onChange={(e) => setSelectedMethod(e.target.value)} 
              />
              <div className="payment-method-label">Cash App Pay</div>
              <div className="payment-method-icons">
                 <div style={{ backgroundColor: '#00D632', width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>$</div>
              </div>
            </label>
          )}
        </div>
      </div>

      <button 
        type="button" 
        className="btn-primary" 
        onClick={handlePay}
        disabled={isProcessing}
      >
        {isProcessing ? 'Procesando...' : (config?.submitButtonText || 'Pagar ahora')}
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-right-muted)', marginTop: '1.5rem', padding: '0 1rem', lineHeight: '1.4' }}>
        Al confirmar tu pago, autorizas a {companyName} a realizar cargos futuros de acuerdo con sus términos. Para cualquier cancelación o reportar un error comunícate con {companyName}.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-right-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Desarrollado por <a href="https://agencsi.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}><img src="https://agencsi.com/wp-content/uploads/2021/08/logo-oficial-agencsi.svg" alt="Agencsi" style={{ height: '18px', verticalAlign: 'middle' }} /></a>
        </span>
        <span style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem' }}>Términos</span>
        <span>Privacidad</span>
      </div>
    </div>
  );
};

export default PaymentForm;
