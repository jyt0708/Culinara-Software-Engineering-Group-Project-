import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { App as AntdApp, ConfigProvider } from 'antd'
import { store } from './store'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  //<StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <ConfigProvider theme={{ token: { colorPrimary: '#50806B' } }}>
          <AntdApp>
            <App />
          </AntdApp>
        </ConfigProvider>
      </Provider>
    </BrowserRouter>
 // </StrictMode>
)
