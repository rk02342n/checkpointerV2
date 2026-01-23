import { createFileRoute } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { userQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getReviewsByGameIdQueryOptions } from '@/lib/reviewsQuery'

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

  const { isPending: isUserPending, error: err, data: dbUserData } = useQuery(dbUserQueryOptions); 
  


  return (
    <div className="flex flex-col items-center gap-4 m-auto justify-center">
      <div><h2>Hello {data.user.given_name}</h2></div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {isUserPending ? <h1>user pending...</h1> :
      <pre>{JSON.stringify(dbUserData, null, 2)}</pre>}
      <Avatar>
        <AvatarImage
          src={data.user.picture}
          alt={data.user.given_name}
          />
        <AvatarFallback>
          {data.user.given_name}
        </AvatarFallback>
      </Avatar>
      <p>{data.user.given_name} {data.user.family_name}</p>
      <div>
      <Button asChild className='my-4 bg-yellow-400 hover:outline-4 outline-black hover:bg-yellow-400'><a href='/api/logout'>Logout</a></Button>
  </div>
  </div>
)
}
