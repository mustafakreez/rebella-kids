// Check if we are running under Electron or plain Node.js
if (!process.versions.electron) {
  console.log('Detected plain Node.js runtime. Directing to compiled Express server...');
  try {
    require('./dist/server.cjs');
  } catch (err) {
    console.error('Failed to load compiled Express server:', err);
    process.exit(1);
  }
} else {
  const { app, BrowserWindow } = require('electron');
  const path = require('path');
  const { spawn } = require('child_process');
  
  let mainWindow;
  let serverProcess;

  function startExpressServer() {
    console.log('Starting Express backend server...');
    const isDev = !app.isPackaged;
    
    // In packaged app, dist/server.cjs exists. Otherwise, we can run TSX or similar.
    const serverPath = isDev 
      ? path.join(__dirname, 'server.ts') 
      : path.join(__dirname, 'dist', 'server.cjs');

    const execPath = isDev ? 'npx' : 'node';
    const args = isDev ? ['tsx', serverPath] : [serverPath];

    // Spawn server process
    serverProcess = spawn(execPath, args, {
      env: { 
        ...process.env, 
        NODE_ENV: isDev ? 'development' : 'production', 
        PORT: '3000' 
      },
      shell: true // Always use shell wrapper for stable cross-platform compatibility (especially on Windows)
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Express stdout]: ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Express stderr]: ${data.toString().trim()}`);
    });
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: 'ريبلا كيدز',
      autoHideMenuBar: true, // Clean corporate look
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Try to load the locally served Express server URLs
    const loadWithRetry = () => {
      mainWindow.loadURL('http://localhost:3000').catch((err) => {
        console.log('Express server not ready yet. Retrying in 500ms...');
        setTimeout(loadWithRetry, 500);
      });
    };

    loadWithRetry();

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.on('ready', () => {
    startExpressServer();
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('quit', () => {
    console.log('Quitting Electron app, terminating Express process...');
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}
