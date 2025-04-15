import type { RouteHandler } from 'fastify';
import { db, getUserFromDatabase } from '../db.js';
import { nango } from '../nango.js';

export const resetGoogleDriveState: RouteHandler = async (_, reply) => {
  try {
    // Delete all files from the database
    await db.files.deleteMany({
      where: {
        integrationId: 'google-drive'
      }
    });

    // Get the user and their connection
    const user = await getUserFromDatabase();
    if (user?.connectionId) {
      // Delete the connection from Nango
      await nango.deleteConnection('google-drive', user.connectionId);
      
      // Remove the connection ID from the user
      await db.users.update({
        where: { id: user.id },
        data: { connectionId: null }
      });
    }

    await reply.status(200).send({ success: true });
  } catch (error) {
    console.error('Failed to reset Google Drive state:', error);
    await reply.status(500).send({ error: 'Failed to reset state' });
  }
}; 