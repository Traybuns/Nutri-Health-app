import React, { useState, useEffect, useRef } from 'react';

// AI Chat Assistant Component
function ChatAssistant() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  async function send() {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { type: 'user', text: message },
        { type: 'assistant', text: data.response }
      ]);
      setMessage('');
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="font-semibold mb-4">AI Health Assistant</h3>
      
      <div className="messages mb-4 max-h-64 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 p-2 rounded ${
            msg.type === 'user' ? 'bg-blue-100 ml-auto max-w-xs' : 'bg-gray-100 max-w-xs'
          }`}>
            <div className="text-sm">{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && send()}
          placeholder="Ask about nutrition, health..."
          className="flex-1 border rounded px-3 py-2"
          disabled={loading}
        />
        <button 
          onClick={send} 
          disabled={loading || !message.trim()}
          className="px-4 bg-teal-600 text-white rounded disabled:opacity-50"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Supports SMS/voice via backend integration.
      </div>
    </div>
  );
}

// Wallet Component
function WalletUI() {
  const [balance, setBalance] = useState(2500);
  const [topupAmount, setTopupAmount] = useState(200);
  const [loading, setLoading] = useState(false);

  async function topup() {
    if (topupAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(topupAmount) })
      });
      
      if (!response.ok) throw new Error('Topup failed');
      
      const data = await response.json();
      setBalance(data.balance);
      alert(`Successfully topped up ₦${topupAmount}`);
    } catch (error) {
      console.error('Topup error:', error);
      alert('Topup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function redeem() {
    if (balance < 100) {
      alert('Insufficient balance for NutriKit redemption');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/redeem', { method: 'POST' });
      
      if (!response.ok) throw new Error('Redemption failed');
      
      const data = await response.json();
      setBalance(data.balance);
      alert('Redeemed: NutriKit sent to PHC');
    } catch (error) {
      console.error('Redemption error:', error);
      alert('Redemption failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="font-semibold">Micro-Insurance Wallet</h3>
      <div className="mt-3">
        Balance: <span className="font-bold text-green-600">₦{balance.toLocaleString()}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          value={topupAmount}
          onChange={e => setTopupAmount(e.target.value)}
          placeholder="Amount"
          min="1"
          className="border rounded px-2 py-1 flex-1"
          disabled={loading}
        />
        <button
          onClick={topup}
          disabled={loading}
          className="px-3 bg-sky-600 text-white rounded disabled:opacity-50"
        >
          {loading ? '...' : 'Top up'}
        </button>
        <button
          onClick={redeem}
          disabled={loading}
          className="px-3 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loading ? '...' : 'Redeem NutriKit'}
        </button>
      </div>
    </div>
  );
}

// Growth Tracker Component
function GrowthTrackerUI() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [muac, setMuac] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load existing entries on component mount
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const response = await fetch('/api/growth');
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  }

  async function save(e) {
    e.preventDefault();
    
    if (!weight || !height || !muac) {
      alert('Please fill all measurements');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        weight: Number(weight),
        height: Number(height),
        muac: Number(muac)
      };

      const response = await fetch('/api/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Save failed');

      const data = await response.json();
      setEntries(arr => [data.entry, ...arr]);
      
      // Clear form
      setWeight('');
      setHeight('');
      setMuac('');

      if (data.alert) {
        alert('ALERT: ' + data.alert);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save measurements. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="font-semibold">Smart Growth Tracker</h3>
      <form onSubmit={save} className="mt-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="7.2"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height (cm)</label>
            <input
              type="number"
              step="0.1"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="68.0"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">MUAC (cm)</label>
            <input
              type="number"
              step="0.1"
              value={muac}
              onChange={e => setMuac(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="13.5"
              disabled={loading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Measurements'}
        </button>
      </form>

      <div className="mt-4">
        <h4 className="text-sm font-medium">Recent Measurements</h4>
        <div className="mt-2 max-h-48 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500">No measurements recorded yet</p>
          ) : (
            <ul className="text-sm text-gray-600">
              {entries.map(entry => (
                <li key={entry.id} className="py-1 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between">
                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                    <span>W: {entry.weight}kg • H: {entry.height}cm • MUAC: {entry.muac}cm</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export { ChatAssistant, WalletUI, GrowthTrackerUI };