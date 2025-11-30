import express from 'express'

const app = express();

app.get('/', (req, res) => {
    res.status(200).send('Studyrok API')
})


export default app;