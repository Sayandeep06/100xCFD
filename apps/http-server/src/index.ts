import express from 'express';
import cors from 'cors'
import { userRouter } from './routes/user';
import { tradesRouter } from './routes/trades';
import { assetsRouter } from './routes/assets';

const app = express();

app.use(cors({
    origin:"*"
}))

app.use(express.json())

app.use('/api/v1/trades', tradesRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/assets', assetsRouter)

app.listen(8080, ()=>{
    console.log(`API Server: http://localhost:3000`)
})