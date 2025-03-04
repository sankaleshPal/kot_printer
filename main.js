const { app, BrowserWindow, ipcMain } = require('electron');
const { io } = require('socket.io-client');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
const net = require('net');
require('dotenv').config();

let mainWindow;
let socket;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  mainWindow.loadFile('src/index.html');

  // Connect to WebSocket
  socket = io(process.env.WS_URL, {
    auth: {
      password: process.env.APP_PASSWORD
    }
  });

  // Printer discovery
  ipcMain.handle('discover-printers', async () => {
    const printers = [];
    const network = '192.168.1'; // Modify based on your network
    
    for (let i = 1; i <= 255; i++) {
      const ip = `${network}.${i}`;
      const isPrinter = await checkPrinter(ip);
      if (isPrinter) printers.push({ ip, status: 'online' });
    }
    
    return printers;
  });

  // Printer registration
  ipcMain.handle('register-printer', (_, printer) => {
    socket.emit('register-printer', printer);
  });

  // Handle print jobs
  socket.on('print-job', async (data, ack) => {
    try {
      const device = new escpos.Network(data.printerIp);
      const printer = new escpos.Printer(device);
      
      await new Promise((resolve, reject) => {
        device.open(() => {
          printer
            .text(`Order: ${data.orderId}`)
            .table(['Item', 'Qty'])
            .dash();
          
          data.items.forEach(item => {
            printer.tableCustom([
              { text: item.name, width: 0.7 },
              { text: item.quantity.toString(), width: 0.3 }
            ]);
          });
          
          printer.cut().close(resolve);
        });
      });
      
      ack({ success: true });
    } catch (error) {
      ack({ success: false, error: error.message });
    }
  });
}

async function checkPrinter(ip) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => resolve(false));
    
    socket.connect(9100, ip);
  });
}

app.whenReady().then(createWindow);