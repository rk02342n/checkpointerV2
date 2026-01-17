import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { userQueryOptions } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
})

// import { api } from '@/lib/api'; //hono-client error

function Profile() {
  const { isPending, error, data, isFetching } = useQuery(userQueryOptions); // look at what query returns here - react query / tanstack query

  if(isPending || isFetching) return("Loading ...");
  if(error) return("Not logged in...");

  return (
    <div>
      <div className=""><h2>Hello {data.user.family_name}</h2></div>
      <div>
    <a href='/api/logout'>Logout</a>
  </div>
  </div>
)
  
}

