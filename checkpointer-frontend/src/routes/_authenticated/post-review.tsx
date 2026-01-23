// import { createFileRoute, useNavigate } from '@tanstack/react-router'
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Button } from '@/components/ui/button'
// import { toast } from 'sonner'
// import { useForm } from '@tanstack/react-form'
// import { getReviewsByGameIdQueryOptions, loadingCreateReviewQueryOptions } from '@/lib/reviewsQuery'
// import { useQueryClient } from '@tanstack/react-query'
// import { createReview } from '@/lib/reviewsQuery'

// export const Route = createFileRoute('/_authenticated/post-review')({
//   component: PostReview,
// })

// function PostReview() {
//   const queryClient = useQueryClient();
//   const navigate = useNavigate();
//   const { gameId } = Route.useParams()
//   const form = useForm({
//     defaultValues: {
//       rating: '',
//       reviewText: '',
//       gameId: '1',
//       userId: 'ummmmmm'
//     },
//     onSubmit: async ({ value }) => {
//       const existingGameReviews = await queryClient.ensureQueryData(
//         getReviewsByGameIdQueryOptions(gameId)
//       ); // grab the existing reviews locally or from server if not on memory
//       navigate({to: '/'});

//     //   Loading state
//       toast.loading("creating review...");
//       queryClient.setQueryData(loadingCreateReviewQueryOptions.queryKey, {review: value})
      
//       try{
//         const newReview = await createReview({ value });
//         queryClient.setQueryData(
//           getReviewsByGameIdQueryOptions(gameId as string).queryKey,
//           {
//             ...existingGameReviews,
//             reviews: [newReview, ...(existingGameReviews.reviews || [])],
//           }
//         ); // update local cache to include new review that was just created
//         // success state
//         toast.dismiss();
//         toast.success(`Review has been added: ID: ${newReview.id}`)
//       } catch(error){
//         // handle error state
//         toast.error("Failed to create new review")
//       } finally{
//         queryClient.setQueryData(loadingCreateReviewQueryOptions.queryKey, {})
//       }
//     },
//   })

//   return (<div className='m-auto p-4 max-w-lg'>
//     <h2 className="text-xl font-semibold tracking-tight p-4 text-center">Create expense</h2>
//     <form
//         onSubmit={(e) => {
//           e.preventDefault()
//           e.stopPropagation()
//           form.handleSubmit()
//         }}
//         className='flex flex-col gap-4'
//       >
//         <form.Field
//             name="reviewText"
//             // validators={{
//             //   onChange: reviewFieldValidators.reviewText
//             // }}
//             children={(field) => (
//               <>
//               <div className='flex flex-col gap-2'>
//                 <Label htmlFor={field.name}>Title</Label>
//                 <Input
//                   id={field.name}
//                   name={field.name}
//                   value={field.state.value}
//                   onBlur={field.handleBlur}
//                   onChange={(e) => field.handleChange(e.target.value)}
//                 />
//                 </div>
//                 <>
//                   {field.state.meta.isTouched && !field.state.meta.isValid ? (
//                     <p className='text-red-600 text-sm'>
//                       {field.state.meta.errors.map((err: any) => 
//                         typeof err === 'string'
//                           ? err
//                           : err && err.message 
//                             ? err.message 
//                             : JSON.stringify(err)
//                       ).join(',')}
//                     </p>
//                   ) : null}
//                   {field.state.meta.isValidating ? 'Validating...' : null}
//                 </>
//               </>
//             )}
//           />

//           <form.Field
//             name="rating"
//             // validators={{
//             //   onChange: createReviewSchema.shape.rating
//             // }}
//             children={(field) => (
//               <>
//                 <div className='flex flex-col gap-2'>
//                 <Label htmlFor={field.name}>Amount</Label>
//                 <Input
//                   id={field.name}
//                   name={field.name}
//                   value={field.state.value}
//                   onBlur={field.handleBlur}
//                   type='number'
//                   onChange={(e) => field.handleChange((e.target.value))}
//                 />
//                 </div>
//                 <>
//                   {field.state.meta.isTouched && !field.state.meta.isValid ? (
//                     <p className='text-red-600 text-sm'>
//                     {field.state.meta.errors.map((err: any) => 
//                       typeof err === 'string'
//                         ? err
//                         : err && err.message 
//                           ? err.message 
//                           : JSON.stringify(err)
//                     ).join(',')}
//                   </p>
//                   ) : null}
//                   {field.state.meta.isValidating ? 'Validating...' : null}
//                 </>
//               </>
//             )}
//           />
//           <form.Subscribe
//           selector={(state) => [state.canSubmit, state.isSubmitting]}
//           children={([canSubmit, isSubmitting]) => (
//             <>
//             <div className='flex flex-row gap-2 justify-center'>
//               <Button type="submit" disabled={!canSubmit}>
//                 {isSubmitting ? '...' : 'Submit'}
//               </Button>
//               <Button
//                 type="reset"
//                 onClick={(e) => {
//                   e.preventDefault()
//                   form.reset()
//                 }}
//               >
//                 Reset
//               </Button>
//               </div>
//             </>
//           )}
//         /> 
//     </form>
//   </div>)
// }
