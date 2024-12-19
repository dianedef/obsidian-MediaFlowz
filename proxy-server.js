const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
const upload = multer();

// Activation du CORS
app.use(cors());

// Route pour l'upload
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { accountId, token } = req.body;
        const file = req.file;

        if (!file || !accountId || !token) {
            return res.status(400).json({ error: 'Fichier, Account ID et Token requis' });
        }

        console.log('Détails du fichier:', {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        console.log('Envoi de la requête à Cloudflare...');
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                body: formData
            }
        );

        console.log('Status de la réponse:', response.status);
        console.log('Headers de la réponse:', response.headers.raw());

        const data = await response.json();
        console.log('Données reçues:', data);
        
        res.json(data);
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur proxy démarré sur http://localhost:${PORT}`);
}); 