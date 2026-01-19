import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { userQueryOptions } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
})

// import { api } from '@/lib/api'; //hono-client error

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'



function Profile() {
  const { isPending, error, data } = useQuery(userQueryOptions); // look at what query returns here - react query / tanstack query

  if(isPending) return("Loading ...");
  if(error) return("Not logged in...");

  return (
    <div className="flex flex-col items-center gap-4 m-auto justify-center">
      <div><h2>Hello {data.user.given_name}</h2></div>
      <Avatar>
        <AvatarImage src={'https://en.wikipedia.org/wiki/SpongeBob_SquarePants_%28character%29#/media/File:SpongeBob_SquarePants_character.png'} alt={data.user.given_name} />
        <AvatarFallback>{data.user.given_name}</AvatarFallback>
      </Avatar>
      <p>{data.user.given_name} {data.user.family_name}</p>
      <div>
      <Button asChild className='my-4'><a href='/api/logout'>Logout</a></Button>
    
  </div>
  </div>
)
}
