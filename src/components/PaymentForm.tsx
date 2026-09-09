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
  initialCustomerData?: Record<string, any>;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ amount, currency, onSuccess, publicApiKey, companyName, companyId, config, paymentGateways = [], initialCustomerData = {} }) => {
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

  const [email, setEmail] = useState<string>(initialCustomerData.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerData, setCustomerData] = useState<Record<string, any>>(() => {
    const { email: _email, ...rest } = initialCustomerData;
    return rest;
  });
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEmail(initialCustomerData.email || '');
    const { email: _email, ...rest } = initialCustomerData;
    setCustomerData(rest);
  }, [initialCustomerData]);

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
        window.Culqi.close?.();
        onSuccess(token, { ...customerData, email });
      } else if (window.Culqi.order) {
        window.Culqi.close?.();
        setIsProcessing(false);
        alert('Este método generó una orden de pago. Por ahora solo está habilitado el cargo directo con tarjeta o Yape.');
      } else {
        console.error('Culqi error:', window.Culqi.error);
        setIsProcessing(false);
        alert(window.Culqi.error?.user_message || 'Hubo un error al generar el token de pago.');
      }
    };
  }, [publicApiKey, amount, currency, companyName, onSuccess, customerData, email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newEmail && newEmail.includes('@')) {
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await axios.get(`${API_URL}/api/customers?email=${encodeURIComponent(newEmail)}&companyId=${encodeURIComponent(companyId)}`);
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
      if (!window.Culqi) {
        alert('No pudimos cargar Culqi. Recarga la página e inténtalo nuevamente.');
        return;
      }

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
              <div className="payment-method-label">Paga con Tarjeta y Yape</div>
              <div className="payment-method-icons">
                <img height={30} src='https://secure.checkout.firstrainingsalud.edu.pe/iconos_pagos.png'/>
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
