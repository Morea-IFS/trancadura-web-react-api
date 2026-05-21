import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket, Server } from 'ws';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  path: '/api/ws', // Aligning with the app's global prefix
})
@Injectable()
export class DevicesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map to store connected clients by device ID (number)
  private clients = new Map<number, WebSocket>();

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: WebSocket, request: any) {
    try {
      const url = request.url || '';
      const queryIndex = url.indexOf('?');
      if (queryIndex === -1) {
        console.log('❌ Connection rejected: no query parameters.');
        client.close(4001, 'Missing credentials');
        return;
      }

      const urlParams = new URLSearchParams(url.substring(queryIndex));
      const macAddress = urlParams.get('macAddress');
      const apiToken = urlParams.get('apiToken');

      if (!macAddress || !apiToken) {
        console.log('❌ Connection rejected: missing macAddress or apiToken.');
        client.close(4001, 'Missing credentials');
        return;
      }

      // Find the device by MAC address
      const device = await this.prisma.device.findUnique({
        where: { macAddress },
      });

      if (!device) {
        console.log(`❌ Connection rejected: device with MAC ${macAddress} not found.`);
        client.close(4002, 'Device not found');
        return;
      }

      if (device.apiToken !== apiToken) {
        console.log(`❌ Connection rejected: invalid API token for MAC ${macAddress}.`);
        client.close(4003, 'Invalid API token');
        return;
      }

      // Store the connection
      this.clients.set(device.id, client);
      console.log(`🔌 Device connected via WebSocket: ID=${device.id}, MAC=${macAddress}`);

      // Send confirmation to the device
      client.send(JSON.stringify({ event: 'connected', deviceId: device.id }));

    } catch (error) {
      console.error('❌ Error handling WS connection:', error);
      client.close(4500, 'Internal Server Error');
    }
  }

  handleDisconnect(client: WebSocket) {
    for (const [deviceId, ws] of this.clients.entries()) {
      if (ws === client) {
        this.clients.delete(deviceId);
        console.log(`🔌 Device disconnected via WebSocket: ID=${deviceId}`);
        break;
      }
    }
  }

  /**
   * Sends an unlock command to a specific device.
   * @returns true if the command was sent successfully, false otherwise.
   */
  sendUnlock(deviceId: number): boolean {
    const ws = this.clients.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'unlock' }));
      return true;
    }
    return false;
  }

  /**
   * Sends a card registration mode command to a specific device.
   * @returns true if the command was sent successfully, false otherwise.
   */
  sendRegisterCard(deviceId: number, userId: number): boolean {
    const ws = this.clients.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'register-card', userId }));
      return true;
    }
    return false;
  }
}
