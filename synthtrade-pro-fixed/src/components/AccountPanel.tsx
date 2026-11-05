import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Link2, Link2Off, Wallet, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { ConnectionState, DerivAccount, DerivAccountType } from '@/hooks/useDerivAPI';

interface AccountPanelProps {
  isRealMode: boolean;
  onToggleMode: (real: boolean) => void;
  connectionState: ConnectionState;
  account: DerivAccount | null;
  appId: string;
  onAppIdChange: (id: string) => void;
  apiToken: string;
  onTokenChange: (token: string) => void;
  accountType: DerivAccountType;
  onAccountTypeChange: (type: DerivAccountType) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  error: string | null;
}

export default function AccountPanel({
  isRealMode,
  onToggleMode,
  connectionState,
  account,
  appId,
  onAppIdChange,
  apiToken,
  onTokenChange,
  accountType,
  onAccountTypeChange,
  onConnect,
  onDisconnect,
  error,
}: AccountPanelProps) {
  const [showToken, setShowToken] = useState(false);

  const stateColors: Record<ConnectionState, string> = {
    disconnected: 'text-[#475569]',
    connecting: 'text-[#f59e0b]',
    connected: 'text-[#f59e0b]',
    authenticated: 'text-[#22c55e]',
    error: 'text-[#ef4444]',
  };

  const stateLabels: Record<ConnectionState, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected (auth required)',
    authenticated: 'Authenticated',
    error: 'Connection Error',
  };

  return (
    <div className="p-4 border-b border-[#2a2f36]">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-[#2563eb]" />
          <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Account Connection</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${isRealMode ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
            {isRealMode ? 'REAL' : 'SIMULATION'}
          </span>
          <Switch
            checked={isRealMode}
            onCheckedChange={onToggleMode}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isRealMode ? (
          <motion.div
            key="real"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1c2128] rounded-md">
              <div className={`w-2 h-2 rounded-full ${
                connectionState === 'authenticated' ? 'bg-[#22c55e] animate-pulse-dot' :
                connectionState === 'connecting' || connectionState === 'connected' ? 'bg-[#f59e0b] animate-pulse-dot' :
                connectionState === 'error' ? 'bg-[#ef4444]' : 'bg-[#475569]'
              }`} />
              <span className={`text-xs font-medium ${stateColors[connectionState]}`}>
                {stateLabels[connectionState]}
              </span>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 px-3 py-2 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-md"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                  <span className="text-[11px] text-[#ef4444]">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connected Account Info */}
            <AnimatePresence>
              {account && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-xs text-[#22c55e] font-medium">Account Connected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#1c2128] rounded-md p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wallet className="w-3 h-3 text-[#475569]" />
                        <span className="text-[10px] text-[#475569]">Balance</span>
                      </div>
                      <span className="text-sm font-mono font-semibold text-white">
                        {account.currency} {account.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-[#1c2128] rounded-md p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3 h-3 text-[#475569]" />
                        <span className="text-[10px] text-[#475569]">Account</span>
                      </div>
                      <span className="text-sm font-mono font-semibold text-white">
                        {account.accountId}
                      </span>
                      <span className={`text-[9px] ml-1 px-1 py-0.5 rounded ${
                        account.accountType === 'demo'
                          ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                          : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      }`}>
                        {account.accountType === 'demo' ? 'DEMO' : 'REAL'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* API Token Input */}
            {!account && (
              <div className="space-y-2">
                <label className="text-[10px] text-[#475569] block">Deriv App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => onAppIdChange(e.target.value)}
                  placeholder="Your registered app_id (from api.deriv.com)"
                  className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-xs text-white font-mono placeholder:text-[#475569] focus:outline-none focus:border-[#2563eb] transition-colors"
                />

                <label className="text-[10px] text-[#475569] block">Deriv API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={apiToken}
                    onChange={(e) => onTokenChange(e.target.value)}
                    placeholder="Paste your Deriv API token here"
                    className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 pr-16 text-xs text-white font-mono placeholder:text-[#475569] focus:outline-none focus:border-[#2563eb] transition-colors"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-[9px] text-[#475569]">
                  Register an app at api.deriv.com → get a Personal Access Token from Account Settings → API Token
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-[#475569]">Account:</span>
                  <button
                    onClick={() => onAccountTypeChange('demo')}
                    className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md border transition-colors ${
                      accountType === 'demo'
                        ? 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/40'
                        : 'bg-[#1c2128] text-[#475569] border-[#2a2f36] hover:text-[#94a3b8]'
                    }`}
                  >
                    DEMO
                  </button>
                  <button
                    onClick={() => onAccountTypeChange('real')}
                    className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md border transition-colors ${
                      accountType === 'real'
                        ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40'
                        : 'bg-[#1c2128] text-[#475569] border-[#2a2f36] hover:text-[#94a3b8]'
                    }`}
                  >
                    REAL MONEY
                  </button>
                </div>

                {/* Connect/Disconnect Button */}
                <button
                  onClick={connectionState === 'authenticated' ? onDisconnect : onConnect}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                    connectionState === 'authenticated'
                      ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#ef4444]/30'
                      : 'bg-[#2563eb]/20 text-[#2563eb] border border-[#2563eb]/40 hover:bg-[#2563eb]/30'
                  }`}
                >
                  {connectionState === 'authenticated' ? (
                    <>
                      <Link2Off className="w-4 h-4" />
                      Disconnect
                    </>
                  ) : connectionState === 'connecting' || connectionState === 'connected' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Connect Account
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Disconnect button when connected */}
            {account && (
              <button
                onClick={onDisconnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#ef4444]/30 transition-all"
              >
                <Link2Off className="w-4 h-4" />
                Disconnect Account
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="sim"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-md">
              <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
              <span className="text-xs text-[#22c55e] font-medium">Simulation Mode Active</span>
            </div>
            <p className="text-[10px] text-[#475569] mt-2">
              Trading with simulated ticks. No real money at risk. Click START to begin.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
