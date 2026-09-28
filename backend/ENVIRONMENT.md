# Variáveis do backend

O backend usa estas variáveis no ambiente de execução:

| Variável | Obrigatória | Exemplo | Uso |
|---|---:|---|---|
| `MONGODB_URI` | sim | `mongodb+srv://usuario:senha@cluster.mongodb.net/duckpong` | String de conexão do MongoDB Atlas |
| `FRONTEND_ORIGIN` | recomendado | `https://duck-pong-frontend.onrender.com` | Origem permitida pelo CORS; aceita múltiplas origens separadas por vírgula |
| `PORT` | não | `10000` | Porta fornecida pelo Render; o código usa a variável automaticamente |

Nunca commite a string `MONGODB_URI`. No Render, crie a variável como secret no serviço do backend.
