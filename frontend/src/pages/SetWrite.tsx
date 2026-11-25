import { useParams } from 'react-router'
import { DeckLesson } from '@/components/sets/DeckLesson'

export default function SetWrite() {
  const { deckId = '' } = useParams()
  return <DeckLesson deckId={deckId} types={['fill_blank']} typing />
}
