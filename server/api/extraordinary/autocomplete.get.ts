import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  await requireUserContext(event) // Just ensure logged in

  const search = query.q as string
  const result = await extraordinaryService.autocompleteVisitor(search)

  return {
    success: true,
    data: result
  }
})
