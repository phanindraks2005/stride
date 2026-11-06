import { supabaseServer as supabase } from './supabase-server'

export async function executeTool(toolName, args, userId) {
  if (toolName === 'log_entry') {
    // Find the tracker by name for this user
    const { data: tracker, error: findError } = await supabase
      .from('trackers')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', args.tracker_name)
      .single()

    if (findError || !tracker) {
      return { success: false, message: `No tracker found named "${args.tracker_name}"` }
    }

    const { error: insertError } = await supabase.from('logs').insert({
      user_id: userId,
      tracker_id: tracker.id,
      value: args.value,
      logged_at: new Date().toISOString(),
    })

    if (insertError) {
      return { success: false, message: insertError.message }
    }

    return {
      success: true,
      message: `Logged ${args.value} ${tracker.unit} for ${tracker.name}`,
      tracker: { name: tracker.name, unit: tracker.unit, color: tracker.color || null },
      value: args.value,
    }
  }

  if (toolName === 'create_tracker') {
    const { error } = await supabase.from('trackers').insert({
      user_id: userId,
      name: args.name,
      unit: args.unit,
      target_value: args.target_value,
      type: 'number',
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return {
      success: true,
      message: `Created new tracker: ${args.name} (target: ${args.target_value} ${args.unit})`,
      tracker: { name: args.name, unit: args.unit, color: null },
      value: args.target_value,
    }
  }
  if (toolName === 'generate_meal_plan') {
    return {
      success: true,
      artifact: {
        type: 'meal_plan',
        title: args.title,
        meals: args.meals,
        note: args.note || '',
      },
    }
  }

  if (toolName === 'generate_workout_plan') {
    return {
      success: true,
      artifact: {
        type: 'workout_plan',
        title: args.title,
        exercises: args.exercises,
        duration_mins: args.duration_mins || null,
        note: args.note || '',
      },
    }
  }

  return { success: false, message: `Unknown tool: ${toolName}` }
}