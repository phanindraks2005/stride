import { supabaseServer as supabase } from './supabase-server'

export async function buildUserContext(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  const { data: trackers } = await supabase
    .from('trackers')
    .select('*')
    .eq('user_id', userId)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: todayLogs } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString())

  const todayTotals = {}
  todayLogs?.forEach((log) => {
    todayTotals[log.tracker_id] = (todayTotals[log.tracker_id] || 0) + log.value
  })

  const { data: notes } = await supabase
    .from('notes')
    .select('title, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: muscleGroups } = await supabase
    .from('muscle_groups')
    .select('id, name')
    .eq('user_id', userId)

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group_id')
    .eq('user_id', userId)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentWorkoutLogs } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', sevenDaysAgo.toISOString())
    .order('logged_at', { ascending: false })

  const trackerSummaries = trackers?.map((tracker) => {
    const logged = todayTotals[tracker.id] || 0
    const remaining = Math.max(0, tracker.target_value - logged)
    return `- ${tracker.name}: ${logged}/${tracker.target_value} ${tracker.unit} today (${remaining} ${tracker.unit} remaining)`
  }).join('\n')

  const notesSummary = notes?.length
    ? notes.map((n) => `- "${n.title}" (${new Date(n.created_at).toLocaleDateString()}): ${n.content.slice(0, 150)}${n.content.length > 150 ? '...' : ''}`).join('\n')
    : 'No notes yet.'

  const workoutSummary = recentWorkoutLogs?.length
    ? recentWorkoutLogs.map((log) => {
        const exercise = exercises?.find((e) => e.id === log.exercise_id)
        const group = muscleGroups?.find((g) => g.id === exercise?.muscle_group_id)
        const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        return `- ${dateStr}: ${exercise?.name || 'Unknown exercise'} (${group?.name || ''}) — ${log.sets}x${log.reps}${log.weight ? ` @ ${log.weight}kg` : ''}`
      }).join('\n')
    : 'No workouts logged in the last 7 days.'

  const profileLine = profile?.name
    ? `The user's name is ${profile.name}${profile.age ? `, age ${profile.age}` : ''}${profile.height_cm ? `, height ${profile.height_cm}cm` : ''}${profile.weight_kg ? `, weight ${profile.weight_kg}kg` : ''}. Always address them by name naturally in conversation, not in every single message, but often enough to feel personal.`
    : ''

  const contextString = `You are Libra, Stride's AI copilot — a fitness and habit tracking assistant. You have access to the user's real, current data below. Use it to give specific, personalized answers, not generic advice. Introduce yourself as Libra when appropriate, but don't over-mention your own name in every reply.

${profileLine}

USER'S TRACKERS AND TODAY'S PROGRESS:
${trackerSummaries || 'No trackers set up yet.'}

USER'S RECENT NOTES (last 5):
${notesSummary}

USER'S STRENGTH TRAINING (last 7 days):
${workoutSummary}

Answer the user's question using all this real data — trackers, notes, and workout history. If asked about something in their notes or workout history specifically, reference it accurately. Be concise and actionable.

IMPORTANT: When the user asks what to eat, wants a meal suggestion, or needs help hitting a nutrition goal, you MUST use the generate_meal_plan tool instead of writing the plan as plain text. When the user asks for a NEW workout, wants exercise ideas, or needs help hitting their workout goal, you MUST use the generate_workout_plan tool instead of writing it as plain text.

When the user asks you to analyze, review, or give feedback on their workout (today's or recent), respond in plain text as a structured written report — NOT the generate_workout_plan tool, since this is analysis, not a new plan. Structure it as: 1) What they trained (muscle groups, exercises, volume), 2) Balance assessment (any muscle groups overtrained, undertrained, or missing recently), 3) One or two specific, actionable suggestions for improvement. Base this strictly on their real logged data above — never invent exercises or numbers they didn't actually log.

Never write meal or new workout suggestions as plain text — always use the matching tool for those specific cases.`

  return contextString
}