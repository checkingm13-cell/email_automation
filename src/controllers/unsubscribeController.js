const UnsubscribeService = require('../services/unsubscribeService');

class UnsubscribeController {
    static async handleUnsubscribe(req, res) {
        try {
            const { token } = req.params;
            const result = await UnsubscribeService.processUnsubscribe(token);

            if (result.success) {
                // Return a clean HTML success page
                res.status(200).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unsubscribed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; color: #333; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
              h2 { color: #28a745; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>You have been successfully unsubscribed.</h2>
              <p><strong>${result.email}</strong> will no longer receive emails from us.</p>
              <p style="font-size: 12px; margin-top: 30px;">If this was a mistake, please contact our support team.</p>
            </div>
          </body>
          </html>
        `);
            } else {
                res.status(400).send(`
          <!DOCTYPE html>
          <html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #dc3545;">Link Invalid</h2>
            <p>${result.message}</p>
          </body></html>
        `);
            }
        } catch (error) {
            console.error('Unsubscribe error:', error.message);
            res.status(500).send('<h2>Error</h2><p>Something went wrong processing your request.</p>');
        }
    }
}

module.exports = UnsubscribeController;