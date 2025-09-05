import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {} from '@solana/web3.js'
import {ConnectionProvider,WalletProvider} from '@solana/wallet-adapter-react'
import {WalletModal, WalletModalProvider} from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

const local='http://localhost:8899'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConnectionProvider endpoint={local}>
      <WalletProvider wallets={[] } autoConnect>
        <WalletModalProvider >
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </StrictMode>,
)
