import { useEffect, useState } from 'react'
import './App.css'
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { api } from './lib/api';

function App() {
  const [totalSpent, setTotalSpent] = useState(0)
  
  useEffect(() => {
    async function fetchTotal(){
      // const res = await fetch("api/expenses/total-spent")
      // client will let us do this instead - helps make everything typesafe
      const res = await api.expenses["total-spent"].$get()
      const data = await res.json()
      setTotalSpent(data.total)
    }
    fetchTotal();
  }, [])

  return (
    <Card className="w-[350px] m-auto">
      <CardHeader>
        <CardTitle>Total spent</CardTitle>
        <CardDescription>
          The total amount you've spent
        </CardDescription>
        <CardAction>
          <Button className='text-black'>{totalSpent}</Button>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

export default App
