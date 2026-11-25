import { useParams } from 'react-router'
import { DeckLesson } from '@/components/sets/DeckLesson'

export default function SetLearn() {
  const { deckId = '' } = useParams()
  return <DeckLesson deckId={deckId} types={['meaning', 'reverse', 'fill_blank', 'traits']} />
}
