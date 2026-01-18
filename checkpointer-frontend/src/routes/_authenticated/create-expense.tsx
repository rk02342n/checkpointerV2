import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button'
import { useForm } from '@tanstack/react-form'

export const Route = createFileRoute('/_authenticated/create-expense')({
  component: CreateExpense,
})

function CreateExpense() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      title: '',
      amount: '',
    },
    onSubmit: async ({ value }) => {
      // Do something with form data
      // await new Promise((r) => setTimeout(r, 2000)) // fake delay to test skeleton
      // const res = await api.expenses.$post({json: value});
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
      })
      if(!res.ok){
        throw new Error("Error while submitting")
      }
      navigate({to: '/expenses'});
    },
  })

  return (<div className='m-auto p-4'>
    <h2 className="text-xl font-semibold tracking-tight p-4 text-center">Create expense</h2>
    <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className='flex flex-col gap-4'
      >
        <form.Field
            name="title"
            children={(field) => (
              <>
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <em>{field.state.meta.errors.join(',')}</em>
                  ) : null}
                  {field.state.meta.isValidating ? 'Validating...' : null}
                </>
              </>
            )}
          />

          <form.Field
            name="amount"
            children={(field) => (
              <>
                <Label htmlFor={field.name}>Amount</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  type='number'
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <em>{field.state.meta.errors.join(',')}</em>
                  ) : null}
                  {field.state.meta.isValidating ? 'Validating...' : null}
                </>
              </>
            )}
          />
          <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? '...' : 'Submit'}
              </Button>
              <Button
                type="reset"
                onClick={(e) => {
                  // Avoid unexpected resets of form elements (especially <select> elements)
                  e.preventDefault()
                  form.reset()
                }}
              >
                Reset
              </Button>
            </>
          )}
        /> 
    </form>
  </div>)
}
